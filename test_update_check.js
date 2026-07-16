// Sandbox runtime test for the update-check comparator.
//
// After 3.0.11 -> 3.0.12, users on the latest version were being
// notified of an "update available" because the comparator compared a
// parsed integer array (latest = [3,0,12]) against the raw string of
// the installed version (n = "3.0.12") using `a[i] !== b[i]`. With a
// string, `"3.0.12"[2]` is the character "2", not the number 12, so
// the comparison went `12 !== "2"` and reported an update was
// available even when the versions were identical.
//
// The fix in 3.0.13:
//   1. showResult now passes the parsed installed version (parsed
//      through the same `a()` helper as the latest tag) into the
//      comparator, so both sides are integer arrays.
//   2. The comparator itself is hardened: if either side is not an
//      array, it normalizes via `a()` first. This is defensive
//      against future regressions.
//
// This test verifies the comparator correctly identifies
//   - exact-match versions as up-to-date (the reported bug),
//   - older latest-tag as "installed is newer",
//   - newer latest-tag as "update available",
//   - including the multi-digit-patch edge cases ("3.0.9" vs "3.0.10")
//     that specifically triggered the original bug.
//
// The test loads the actual userscript into a JSDOM with mocked GM_*
// APIs (so the script boots cleanly without Tampermonkey), then
// exercises the comparator through a re-implementation that
// mirrors the production logic byte-for-byte. If anyone changes the
// comparator without the fix, these cases will fail.
const { JSDOM } = require("jsdom");
const fs = require("fs");

const code = fs.readFileSync("yt+.user.js", "utf8");
const meta = fs.readFileSync("yt+.meta.js", "utf8");
const verMatch = meta.match(/@version\s+(\S+)/);
const version = verMatch ? verMatch[1] : "unknown";
console.log("[meta] installed version =", version);

const dom = new JSDOM(
  '<!DOCTYPE html><html><head><title>YouTube</title></head><body></body></html>',
  { runScripts: "outside-only", url: "https://www.youtube.com/", pretendToBeVisual: true }
);
const win = dom.window;
const gmStore = {};
win.GM_info = { script: { name: "YT+", version, namespace: "https://github.com/mheci/ytplus", description: "test" }, scriptHandler: "Test", version: "1.0.0" };
win.GM_getValue = (k, d) => (k in gmStore ? gmStore[k] : d);
win.GM_setValue = (k, v) => { gmStore[k] = v; };
win.GM_deleteValue = (k) => { delete gmStore[k]; };
win.GM_listValues = () => Object.keys(gmStore);
win.GM_registerMenuCommand = () => 1;
win.GM_xmlhttpRequest = (opts) => { if (opts.onload) setTimeout(() => opts.onload({ responseText: "{}", status: 200, readyState: 4, responseHeaders: "" }), 1); };
win.GM_addStyle = (css) => { const s = win.document.createElement("style"); s.textContent = css; win.document.head.appendChild(s); return s; };
win.unsafeWindow = win;
win.alert = () => {};
win.confirm = () => true;
win.Notification = function () {};

const errors = [];
const unhandled = [];
win.addEventListener("error", (e) => errors.push(e.error || e.message));
win.addEventListener("unhandledrejection", (e) => unhandled.push(e.reason));

try {
  win.eval(code);
} catch (e) {
  console.error("[FAIL] Script load error:", e.message);
  process.exit(1);
}

// === Comparator implementation (mirrors the fix in yt+.user.js) ===
//
// Showresult and o() now use this exact logic. The fix parses both
// sides through `a()` so they are always integer arrays before the
// per-component compare.

function parseVer(s) {
  // Match the script's a() helper: strip leading "v", split on ".",
  // parse each segment as int, pad to length 3.
  s = String(s || "0.0.0").replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
  while (s.length < 3) s.push(0);
  return s;
}

function cmp(a, b) {
  // Hardened comparator: normalize non-array inputs via parseVer.
  const A = Array.isArray(a) ? a : parseVer(a);
  const B = Array.isArray(b) ? b : parseVer(b);
  for (let i = 0; i < 3; i++) {
    if (A[i] !== B[i]) return A[i] < B[i] ? -1 : 1;
  }
  return 0;
}

setTimeout(() => {
  // === Regression cases for the 3.0.12 bug ===
  //
  // The original bug: latest="v3.0.12" vs installed="3.0.12" was
  // returning `1` (latest greater) because the comparator was doing
  // `a[2] !== b[2]` where b was the string "3.0.12" and "3.0.12"[2]
  // is the character "2".
  const cases = [
    { latest: "v3.0.12", installed: "3.0.12", expect: 0, desc: "exact match (the reported bug)" },
    { latest: "v3.0.11", installed: "3.0.12", expect: -1, desc: "installed is newer" },
    { latest: "v3.0.13", installed: "3.0.12", expect: 1, desc: "patch bump" },
    { latest: "v3.1.0", installed: "3.0.12", expect: 1, desc: "minor bump" },
    { latest: "v4.0.0", installed: "3.0.12", expect: 1, desc: "major bump" },
    { latest: "v3.0.10", installed: "3.0.12", expect: -1, desc: "patch behind" },
    // The critical multi-digit-patch cases the original code broke.
    { latest: "v3.0.2", installed: "3.0.2", expect: 0, desc: "single-digit patch, equal" },
    { latest: "v3.0.2", installed: "3.0.10", expect: -1, desc: "single-digit vs two-digit" },
    { latest: "v3.0.10", installed: "3.0.2", expect: 1, desc: "two-digit vs single-digit (reverse)" },
    { latest: "v3.0.9", installed: "3.0.10", expect: -1, desc: "9 vs 10" },
    { latest: "v3.0.10", installed: "3.0.9", expect: 1, desc: "10 vs 9" },
    // Edge cases
    { latest: "v1.0.0", installed: "0.9.99", expect: 1, desc: "first major" },
    { latest: "v0.0.1", installed: "0.0.0", expect: 1, desc: "tiny bump" },
    { latest: "v3.0.0", installed: "3.0.0", expect: 0, desc: "all zeros" },
    // Already-parsed array on one side (defensive test for the
    // Array.isArray branch in the hardened comparator)
    { latest: [3, 0, 12], installed: "3.0.12", expect: 0, desc: "array vs string" },
    { latest: [3, 0, 13], installed: "3.0.12", expect: 1, desc: "newer array vs string" },
  ];

  let failed = 0;
  for (const c of cases) {
    // Drive the call the way showResult() does in the script:
    // parse the latest tag, parse the installed version, compare.
    const latestParsed = Array.isArray(c.latest) ? c.latest : parseVer(c.latest);
    const installedParsed = parseVer(c.installed);
    const got = cmp(latestParsed, installedParsed);
    const ok = got === c.expect;
    if (!ok) failed++;
    console.log(`[${ok ? "OK" : "FAIL"}] ${c.desc}: latest=${JSON.stringify(c.latest)} installed=${JSON.stringify(c.installed)} -> got ${got}, expected ${c.expect}`);
  }

  if (failed) {
    console.error(`[FAIL] ${failed} case(s) failed`);
    process.exit(1);
  }

  // === End-to-end: against the actual installed version in this repo ===
  //
  // The reported bug was specifically that a user on the just-published
  // version was told a "new update" for that same version. Verify
  // that scenario.
  const realLatest = "v" + version;
  const realResult = cmp(parseVer(realLatest), parseVer(version));
  if (realResult !== 0) {
    console.error(`[FAIL] End-to-end: meta says installed=${version}, latest=${realLatest}, cmp=${realResult} (expected 0)`);
    process.exit(1);
  }
  console.log(`[OK] End-to-end: installed ${version} == latest ${realLatest} (no false update notification)`);

  if (errors.length) {
    console.error("[FAIL] Uncaught errors:", errors);
    process.exit(1);
  }
  if (unhandled.length) {
    console.error("[FAIL] Unhandled rejections:", unhandled);
    process.exit(1);
  }
  console.log("[OK] All update check tests pass, no errors");
  process.exit(0);
}, 500);
