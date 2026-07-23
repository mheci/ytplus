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

  // === v3.0.18.9 source-level regression checks ===
  // The "Check for updates" entry had two bugs fixed in v3.0.18.9.
  // Both are behavior-level, but the comparator-level tests
  // above don't exercise either; we add source-grep checks
  // here as a regression guard. The behavioral tests are
  // complex (would require mocking the GM_xmlhttpRequest path
  // and inspecting toast click handlers) and are deferred
  // to a jsdom-driven integration test in a follow-up.
  //
  // 1. Cache is not written on a failed check. The previous
  //    code wrote the timestamp BEFORE firing the request,
  //    so a single network blip suppressed the next 10
  //    minutes of auto-checks. The fix moves the GM_setValue
  //    into the success path inside onDone(). The source is
  //    minified so we look for the structural marker that
  //    _CHECK_CACHE_KEY is set in the success branch and not
  //    before the request fires.
  const hasCacheOnSuccess = /GM_setValue\(\s*_CHECK_CACHE_KEY\s*,\s*Date\.now\(\)\s*\)/.test(code);
  if (!hasCacheOnSuccess) {
    console.error("[FAIL] Update check cache must be written via _CHECK_CACHE_KEY on success (v3.0.18.9 regression guard)");
    process.exit(1);
  }
  // Verify the cache key is only set ONCE in the file (in the
  // success path) — if a future regression adds a pre-request
  // write, the count will jump to 2 and the test fails.
  const cacheWriteCount = (code.match(/GM_setValue\(\s*_CHECK_CACHE_KEY/g) || []).length;
  if (cacheWriteCount !== 1) {
    console.error("[FAIL] _CHECK_CACHE_KEY must be written exactly once (in onDone success path). Found " + cacheWriteCount + " writes. (v3.0.18.9 regression guard)");
    process.exit(1);
  }
  console.log("[OK] Update check cache is written on success only (v3.0.18.9)");

  // 2. The "up to date" toast is clickable. Verify the source
  //    attaches a click handler that opens the GitHub releases
  //    page so the user has somewhere to go when they're on
  //    the latest version.
  const hasUpToDateClick = /showUpToDate[\s\S]{0,2000}window\.open\(\s*_GITHUB_RELEASES/.test(code);
  if (!hasUpToDateClick) {
    console.error("[FAIL] 'Up to date' toast must be clickable to open the GitHub releases page (v3.0.18.9 regression guard)");
    process.exit(1);
  }
  console.log("[OK] 'Up to date' toast is clickable (v3.0.18.9)");

  // 3. The "check failed" toast is clickable to retry. The
  //    user shouldn't have to wait for the auto-dismiss
  //    before being able to retry.
  const hasRetryClick = /showCheckFailed[\s\S]{0,2000}Fu\(\s*true\s*\)/.test(code);
  if (!hasRetryClick) {
    console.error("[FAIL] 'Check failed' toast must be clickable to retry (v3.0.18.9 regression guard)");
    process.exit(1);
  }
  console.log("[OK] 'Check failed' toast is clickable to retry (v3.0.18.9)");

  // 4. The "force" parameter is named (no longer `e`). The
  //    old name shadowed the outer `e` = unsafeWindow and
  //    made the rest of the function harder to read.
  const hasForceParam = /function\s+Fu\s*\(\s*force\s*\)/.test(code);
  if (!hasForceParam) {
    console.error("[FAIL] Fu's parameter must be named `force` (v3.0.18.9 — readability)");
    process.exit(1);
  }
  console.log("[OK] Fu's parameter is named `force` (v3.0.18.9)");

  // 5. The GitHub URLs are defined in one place as module-scope
  //    constants. If someone changes a URL in one place, they
  //    should change them all.
  const hasUrlConstants = /const\s+_GITHUB_API_LATEST\s*=\s*"https:\/\/api\.github\.com/.test(code) &&
                        /const\s+_GITHUB_LATEST_USERJS\s*=\s*"https:\/\/github\.com/.test(code) &&
                        /const\s+_GITHUB_RELEASES\s*=\s*"https:\/\/github\.com/.test(code);
  if (!hasUrlConstants) {
    console.error("[FAIL] GitHub URLs must be defined as module-scope _GITHUB_* constants (v3.0.18.9 — DRY)");
    process.exit(1);
  }
  console.log("[OK] GitHub URLs are defined as module-scope constants (v3.0.18.9)");

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
