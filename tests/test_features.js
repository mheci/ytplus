// test_features.js — regression guard for v3.0.21.0 + v3.0.21.0 changes:
// geo unpatch chain-safety, SB cache key, bfcache lifecycle, the creative
// features (clipboard screenshot, speed step, per-channel speed memory,
// jump-to-highlight), and the import validation hardening.
"use strict";
const fs = require("fs");
const path = require("path");
const code = fs.readFileSync(
  path.join(__dirname, "..", "yt+.user.js"),
  "utf8",
);

let passed = 0,
  failed = 0;
function ok(name, cond) {
  if (cond) {
    passed++;
    console.log("  ok  - " + name);
  } else {
    failed++;
    console.error("  FAIL - " + name);
    process.exitCode = 1;
  }
}
function block(name, fn) {
  console.log(name);
  fn();
}

block("GEO WRAPPER CHAIN SAFETY (v3.0.21.0)", () => {
  ok("En() no longer restores pristine fetch",
     /function En\(\) \{\s*\/\/ no-op by design/.test(code));
  ok("Bn() no longer restores pristine XHR",
     /function Bn\(\) \{\s*\/\/ no-op by design/.test(code));
  ok("no module restores sendBeacon to the pristine reference (chain-safe)",
     !/navigator\.sendBeacon =\s*\n?\s*typeof __pristineBeacon__[\s\S]{0,80}?__pristineBeacon__[\s\S]{0,40}?:\s*(fn|Kn);/.test(code));
  ok("netMonitor wrappers self-neutralize instead of restoring",
     /permanent wrapper, self-neutralizing gate/.test(code));
  ok("geo fetch wrapper gates on xn() AND S.geoPatchFetch",
     /if \(!xn\(\) \|\| !S\.geoPatchFetch\) return mn\.call\(this, e, t\);/.test(code));
  ok("geo XHR open gates on S.geoPatchXHR",
     /xn\(\) &&\s*S\.geoPatchXHR &&\s*"string" == typeof arguments\[1\]/.test(code));
  ok("geo beacon wrapper gates on S.geoPatchBeacon",
     /xn\(\) &&\s*S\.geoPatchBeacon &&\s*"string" == typeof e &&/.test(code));
});

block("SPONSORBLOCK CACHE KEY (v3.0.21.0)", () => {
  const m = code.match(/const filterKey = \[([\s\S]{0,900}?)\]\.join\("\|"\);/);
  ok("filterKey block found", !!m);
  if (m) {
    ok("cache key includes sbServerPreset", /S\.sbServerPreset/.test(m[1]));
    ok("cache key includes sbServer", /S\.sbServer \|\| ""/.test(m[1]));
    ok("cache key includes sbPrivacy", /S\.sbPrivacy \? 1 : 0/.test(m[1]));
  }
  ok("dead St_fetchInFlight counter fully removed",
     !/St_fetchInFlight/.test(code));
});

block("BFCACHE-SAFE LIFECYCLE (v3.0.21.0)", () => {
  ok("pagehide runs a maintenance checkpoint (not disposeAll)",
     /"memory-pagehide-checkpoint"/.test(code));
  ok("the pagehide listener runs maintenance, not disposeAll",
     /safeListener\([\s\S]{0,300}?"pagehide",[\s\S]{0,120}?runMaintenance\(\);/.test(code) &&
     !/safeListener\([\s\S]{0,300}?"pagehide",[\s\S]{0,120}?disposeAll\(\)/.test(code));
  ok("maintenance tick skips while hidden (truthful, self-checked)",
     /document\.visibilityState === "hidden"[\s\S]{0,40}?return;[\s\S]{0,80}?_mp\.runMaintenance\(\)/.test(code)
     || /visibilityState[\s\S]{0,400}?_mp\.runMaintenance/.test(code));
  ok("dead untilHidden mechanism removed (no assignment/read)",
     !/\.untilHidden\s*=/.test(code));
  ok("GM_info-less version fallback is current", /"3\.0\.21\.0"/.test(code));
});

block("CLIPBOARD SCREENSHOT (v3.0.21.0)", () => {
  ok("screenshotClipboard default is false",
     /screenshotClipboard: !1/.test(code));
  ok("clipboard path is opt-in (guarded by S.screenshotClipboard)",
     /S\.screenshotClipboard &&\s*"undefined" != typeof ClipboardItem/.test(code));
  ok("clipboard write uses toBlob with the chosen format",
     /a\.toBlob\(res, o, 0\.95\)/.test(code));
  ok("download fallback still exists after the early return",
     /d\.href = a\.toDataURL\(o, 0\.95\)/.test(code));
  ok("screenshot feature keys list includes screenshotClipboard",
     /"screenshotFmt", "screenshotScale", "screenshotClipboard"/.test(code));
});

block("SPEED STEP (v3.0.21.0)", () => {
  ok("speedStep default is 0.25", /speedStep: 0\.25/.test(code));
  ok("speedUp action honors S.speedStep (clamped, rounded)",
     /Math\.min\(4, Math\.round\(\(\(v\.playbackRate \|\| 1\) \+ step\) \* 100\) \/ 100\)/.test(code));
  ok("speedDown action honors S.speedStep",
     /Math\.max\(0\.25, Math\.round\(\(\(v\.playbackRate \|\| 1\) - step\) \* 100\) \/ 100\)/.test(code));
  ok("step clamped 0.05..1", /Math\.max\(0\.05, Math\.min\(1, Number\(S\.speedStep\) \|\| 0\.25\)\)/.test(code));
  ok("speed-controller card exposes the step", /"Hotkey step", "speedStep"/.test(code));
});

block("PER-CHANNEL SPEED MEMORY (v3.0.21.0)", () => {
  ok("speedPerChannelOn default is false", /speedPerChannelOn: !1/.test(code));
  ok("feature registered with masterKey",
     /id: "speed-per-channel"[\s\S]{0,400}?masterKey: "speedPerChannelOn"/.test(code));
  ok("LRU cap at 200 channels (drops oldest 50)",
     /keys\.length >= 200/.test(code) && /keys\.slice\(0, 50\)/.test(code));
  ok("one IDB kv record (no unbounded key growth)",
     /k\{?\s*:\s*"__perChSpeed__"|k: "__perChSpeed__"/.test(code));
  ok("ratechange is captured at document level (media events don't bubble)",
     /e\.addListener\(\s*document,\s*"ratechange",[\s\S]{0,120}?!0,?\s*\)/.test(code));
  ok("restore is once-per-video (no fighting manual changes)",
     /vid \|\| vid === _spdLastVid/.test(code) || /_spdLastVid = vid/.test(code));
});

block("JUMP TO HIGHLIGHT (v3.0.21.0)", () => {
  ok("sb.jumpToHighlight action registered",
     /id: "sb\.jumpToHighlight"/.test(code));
  ok("looks for poi_highlight / actionType poi in loaded segments",
     /s\.category === "poi_highlight" \|\| s\.actionType === "poi"/.test(code));
  ok("unbound by default (def: null, no hotkey conflicts)",
     /id: "sb\.jumpToHighlight"[\s\S]{0,200}?def: null/.test(code));
});

block("IMPORT VALIDATION (v3.0.21.0)", () => {
  ok("history rows filtered to valid videoId before IDB write",
     /t\.history[\s\S]{0,40}?\.filter\([\s\S]{0,340}?"string" == typeof e\.videoId[\s\S]{0,150}?\.map\(\(e\) => Be\(e\)\)/.test(code));
  ok("bookmark rows filtered to valid id before IDB write",
     /t\.bookmarks[\s\S]{0,40}?\.filter\([\s\S]{0,340}?"string" == typeof e\.id[\s\S]{0,150}?\.map\(\(e\) => k\("bookmarks", e\)\)/.test(code));
});

console.log(`\n${passed} passed, ${failed} failed`);
