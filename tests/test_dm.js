// test_dm.js — Data minimization unit tests.
//
// The feature installs a single fetch/XHR/sendBeacon filter at IIFE
// start. When the master toggle is OFF, every URL passes through.
// When it's ON, the wrapper drops:
//   * /api/stats/{watchtime,playback,qoe,ads,att_get,...}
//   * /youtubei/v1/log_event
//   * /pagead/*, /ptracking, /get_midroll_info, /generate_204
//   * googleads.g.doubleclick.net/pagead/*
//   * (Optionally) /s/player/heartbeat, /youtubei/v1/heartbeat*
//
// We exercise the filter by:
//   1. Calling fetch() / sendBeacon() / opening XHRs and inspecting the
//      captured arguments. The test harness replaces the pristine
//      versions with counters BEFORE the userscript loads, so the
//      wrappers fall through to those counters.
//   2. Calling YTPlus.dataMin.{config,stats,shouldDrop,endpoints} and
//      checking the public surface matches.
//
// Run:  node test_dm.js

"use strict";

const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const USERSCRIPT = fs.readFileSync(
  path.join(__dirname, "..", "yt+.user.js"),
  "utf8",
);

// JSDOM environment. We need to stub GM_* and capture outbound network
// calls BEFORE the userscript runs.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  runScripts: "outside-only",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  pretendToBeVisual: true,
});
const { window } = dom;

if (!window.crypto || !window.crypto.subtle) {
  const nodeCrypto = require("crypto").webcrypto;
  Object.defineProperty(window, "crypto", { value: nodeCrypto });
}

// Capture every outbound network call. We install a pristine fetch /
// XHR / sendBeacon BEFORE the userscript runs so the data-min wrappers
// fall through to these counters. The wrappers' short-circuit (return
// 204 / true) is also asserted via the call-count delta.
const netLog = { fetch: [], xhrOpen: [], xhrSend: [], beacon: [] };
// Minimal Response-like stand-in. JSDOM 29 ships Response in some
// builds but not all; this duck-types just enough to keep awaiters
// from throwing.
function fakeResponse(body, init) {
  return {
    ok: true,
    status: (init && init.status) || 200,
    statusText: (init && init.statusText) || "OK",
    text: () => Promise.resolve(body || ""),
    json: () => Promise.resolve(JSON.parse(body || "{}")),
    body: null,
    headers: new Map(),
    url: "",
  };
}
const realFetch = async (url, init) => {
  netLog.fetch.push({ url: String(url), init });
  return fakeResponse("{}", { status: 200, statusText: "OK" });
};
window.fetch = realFetch;
// XHR: keep real prototype but wrap to record calls
const _xhrOpen = window.XMLHttpRequest.prototype.open;
const _xhrSend = window.XMLHttpRequest.prototype.send;
window.XMLHttpRequest.prototype.open = function (method, url) {
  netLog.xhrOpen.push({ method, url: String(url) });
  this.__ytpTestUrl = String(url);
  return _xhrOpen.apply(this, arguments);
};
window.XMLHttpRequest.prototype.send = function () {
  netLog.xhrSend.push({ url: this.__ytpTestUrl });
  // Fire a fake load event so onload handlers don't error.
  const xhr = this;
  Promise.resolve().then(() => {
    try {
      Object.defineProperty(xhr, "readyState", { get: () => 4 });
      Object.defineProperty(xhr, "status", { get: () => 200 });
      Object.defineProperty(xhr, "statusText", { get: () => "OK" });
      Object.defineProperty(xhr, "responseText", { get: () => "" });
    } catch (e) {}
    try {
      xhr.dispatchEvent(new window.Event("load"));
      xhr.dispatchEvent(new window.Event("loadend"));
    } catch (e) {}
  });
  // Do NOT call _xhrSend — the wrapper handles the short-circuit
  // and decides whether to forward. But because we replaced send, the
  // wrapper itself can't be the one in the prototype. So this stub
  // IS the send path: it just records. For the "real send happens"
  // assertion, we count xhrOpen calls vs xhrSend calls.
};
window.navigator.sendBeacon = function (url, data) {
  netLog.beacon.push({ url: String(url), size: (data && data.length) || 0 });
  return true; // pretend the beacon was queued
};

// GM stubs.
window.GM_getValue = (k, d) => d;
window.GM_setValue = () => {};
window.GM_deleteValue = () => {};
window.GM_listValues = () => [];
window.GM_registerMenuCommand = () => {};
window.GM_addStyle = () => {};
window.GM_info = { script: { version: "0.0.0" } };
window.unsafeWindow = window;

// Inject the userscript.
try {
  window.eval(USERSCRIPT);
} catch (e) {
  console.error("Script load error:", e && (e.stack || e.message || e));
  process.exit(1);
}

async function waitForReady() {
  for (let i = 0; i < 200; i++) {
    if (window.YTPlus) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("YTPlus never became ready");
}

// Test harness.
let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log("  ok - " + msg);
  } else {
    fail++;
    console.log("  FAIL - " + msg);
  }
}
function reset() {
  netLog.fetch.length = 0;
  netLog.xhrOpen.length = 0;
  netLog.xhrSend.length = 0;
  netLog.beacon.length = 0;
  // Note: YTPlus.dataMin.stats() returns a CLONE of the live counter,
  // so resetting that clone doesn't reset the source of truth. We
  // capture a snapshot of the dropped count and compute deltas
  // instead. Each test reads `droppedAtStart` before making calls
  // and compares to the new value.
}

(async () => {
  await waitForReady();
  const YTPlus = window.YTPlus;
  if (!YTPlus || !YTPlus.dataMin) {
    console.error("FATAL: YTPlus.dataMin not exposed");
    process.exit(1);
  }

  console.log("\n# Config defaults");
  assert(
    YTPlus.dataMin.config().on === false,
    "default dataMinimizationOn is false (opt-in)",
  );
  assert(
    YTPlus.dataMin.config().blockStats === true,
    "default dataMinBlockStats is true",
  );
  assert(
    YTPlus.dataMin.config().blockPagead === true,
    "default dataMinBlockPagead is true",
  );
  assert(
    YTPlus.dataMin.config().blockLogEvent === true,
    "default dataMinBlockLogEvent is true",
  );
  assert(
    YTPlus.dataMin.config().allowHeartbeat === true,
    "default dataMinAllowHeartbeat is true (heartbeat preserved)",
  );

  console.log("\n# When OFF, all URLs pass through");
  reset();
  await window.fetch("/api/stats/watchtime?test=off-fetch");
  const offXhr = new window.XMLHttpRequest();
  offXhr.open("GET", "/api/stats/ads?test=off-xhr");
  offXhr.send();
  window.navigator.sendBeacon("/youtubei/v1/log_event?test=off", "");
  // XHRs are dispatched async; give the microtask queue a tick.
  await new Promise((r) => setTimeout(r, 5));
  assert(netLog.fetch.length === 1, "fetch went through (off)");
  assert(
    netLog.fetch[0].url.indexOf("/api/stats/watchtime") >= 0,
    "fetch URL preserved (off)",
  );
  assert(netLog.xhrOpen.length === 1, "XHR open went through (off)");
  assert(netLog.beacon.length === 1, "sendBeacon went through (off)");
  assert(
    YTPlus.dataMin.stats().dropped === 0,
    "no drops counted (off)",
  );

  console.log("\n# Toggle ON");
  YTPlus.dataMin.enable();
  assert(
    YTPlus.dataMin.config().on === true,
    "dataMin.on() flips master to true",
  );

  console.log("\n# When ON, telemetry URLs are dropped");
  const droppedAtT0 = YTPlus.dataMin.stats().dropped;
  reset();
  await window.fetch("/api/stats/watchtime?test=on-fetch");
  await window.fetch("/api/stats/playback?test=on-fetch-2");
  await window.fetch("/api/stats/ads?test=on-fetch-3");
  await window.fetch("/youtubei/v1/log_event?test=on-fetch-4");
  await window.fetch("/pagead/interaction?test=on-fetch-5");
  await window.fetch("/ptracking?test=on-fetch-6");
  await window.fetch("/get_midroll_info?test=on-fetch-7");
  // Cross-origin
  await window.fetch(
    "https://googleads.g.doubleclick.net/pagead/interaction?test=on-fetch-8",
  );
  // XHR telemetry. The XHR *open* call is recorded by the test's
  // recorder stub (which is what the data-min wrapper sees as the
  // pristine prototype), but the data-min wrapper short-circuits the
  // *send*, so the request never actually fires — that is what
  // matters for privacy.
  const onXhr = new window.XMLHttpRequest();
  onXhr.open("GET", "/api/stats/qoe?test=on-xhr");
  onXhr.send();
  // Beacon telemetry
  window.navigator.sendBeacon("/api/stats/att_get?test=on-beacon", "");
  window.navigator.sendBeacon("/pagead/conversion?test=on-beacon-2", "");
  // Wait for XHR microtask
  await new Promise((r) => setTimeout(r, 20));
  assert(
    netLog.fetch.length === 0,
    "all telemetry fetch()s short-circuited (got " +
      netLog.fetch.length +
      ")",
  );
  // The XHR recorder sees the *open* call (because the test installed
  // its recorder on XMLHttpRequest.prototype.open BEFORE the
  // userscript ran, so the userscript's wrapper sits on top of the
  // recorder). The fact that the request never fired is captured by
  // the data-min's dropped counter, not by the XHR recorder. We
  // assert the recorder saw NO *send* call for the telemetry URL.
  const onXhrSends = netLog.xhrSend.filter(
    (e) => e.url.indexOf("/api/stats/qoe") >= 0,
  );
  assert(
    onXhrSends.length === 0,
    "telemetry XHR send() intercepted (got " + onXhrSends.length + ")",
  );
  assert(
    netLog.beacon.length === 0,
    "telemetry beacons short-circuited (got " +
      netLog.beacon.length +
      ")",
  );
  const s = YTPlus.dataMin.stats();
  const droppedDelta = s.dropped - droppedAtT0;
  assert(
    droppedDelta >= 7,
    "dropped count incremented by >= 7 (got " + droppedDelta + ")",
  );
  assert(
    Object.keys(s.byHost || {}).some((h) => h.indexOf("doubleclick") >= 0),
    "byHost tracks the doubleclick.net hits",
  );

  console.log("\n# When ON, content URLs are NOT dropped");
  const droppedBefore = YTPlus.dataMin.stats().dropped;
  reset();
  await window.fetch("/youtubei/v1/player?key=test&videoId=abc");
  await window.fetch("/youtubei/v1/browse?key=test");
  await window.fetch("/youtubei/v1/next?key=test");
  await window.fetch("/youtubei/v1/search?key=test");
  // Player heartbeat IS allowed by default
  await window.fetch("/s/player/heartbeat?test=ok");
  await window.fetch("/youtubei/v1/heartbeat?test=ok");
  // Other YouTube infrastructure
  await window.fetch("https://i.ytimg.com/vi/abc/maxresdefault.jpg");
  await window.fetch("https://googlevideo.com/videoplayback?id=xyz");
  assert(
    netLog.fetch.length >= 7,
    "content fetch()s passed through (got " +
      netLog.fetch.length +
      " of 7+)",
  );
  const s2 = YTPlus.dataMin.stats();
  const contentDropped = s2.dropped - droppedBefore;
  assert(
    contentDropped === 0,
    "no new drops for content URLs (delta " + contentDropped + ")",
  );

  console.log("\n# Heartbeat opt-out (dataMinAllowHeartbeat=false)");
  reset();
  YTPlus.dataMin.setBlock("dataMinAllowHeartbeat", false);
  await window.fetch("/s/player/heartbeat?test=hb-blocked");
  await window.fetch("/youtubei/v1/heartbeat?test=hb-blocked");
  assert(
    netLog.fetch.length === 0,
    "heartbeat blocked when allowHeartbeat is false (got " +
      netLog.fetch.length +
      ")",
  );
  // Restore
  YTPlus.dataMin.setBlock("dataMinAllowHeartbeat", true);

  console.log("\n# Sub-toggle isolation");
  const droppedBefore2 = YTPlus.dataMin.stats().dropped;
  reset();
  YTPlus.dataMin.setBlock("dataMinBlockStats", false);
  await window.fetch("/api/stats/watchtime?test=stats-off");
  await window.fetch("/youtubei/v1/log_event?test=stats-off-le");
  assert(
    netLog.fetch.length === 1,
    "stats disabled: only one fetch passed through (got " +
      netLog.fetch.length +
      ")",
  );
  assert(
    netLog.fetch[0].url.indexOf("/api/stats/watchtime") >= 0,
    "remaining fetch is the watchtime one (stats off, log_event still blocked)",
  );
  // Re-enable
  YTPlus.dataMin.setBlock("dataMinBlockStats", true);
  await window.fetch("/api/stats/watchtime?test=stats-back");
  assert(
    netLog.fetch.length === 1,
    "stats re-enabled: no new passes (got " + netLog.fetch.length + ")",
  );
  // Drop counter should have incremented by exactly 2 (the
  // log_event + the re-enabled watchtime)
  const s3 = YTPlus.dataMin.stats();
  const subDelta = s3.dropped - droppedBefore2;
  assert(
    subDelta === 2,
    "exactly 2 drops recorded (log_event + re-enabled stats) (got " +
      subDelta +
      ")",
  );

  console.log("\n# shouldDrop() public surface");
  assert(
    YTPlus.dataMin.shouldDrop(
      "https://www.youtube.com/api/stats/watchtime?x=1",
    ) === true,
    "shouldDrop(/api/stats/watchtime) = true when on",
  );
  assert(
    YTPlus.dataMin.shouldDrop("https://www.youtube.com/youtubei/v1/player?k=1") ===
      false,
    "shouldDrop(/youtubei/v1/player) = false",
  );
  assert(
    YTPlus.dataMin.shouldDrop(
      "https://googleads.g.doubleclick.net/pagead/foo",
    ) === true,
    "shouldDrop(doubleclick pagead) = true",
  );

  console.log("\n# Master toggle off → wrappers re-enable network");
  reset();
  YTPlus.dataMin.disable();
  await window.fetch("/api/stats/watchtime?test=master-off");
  assert(
    netLog.fetch.length === 1,
    "master off: telemetry fetch passes through (got " +
      netLog.fetch.length +
      ")",
  );
  // Re-enable for the rest of the tests
  YTPlus.dataMin.enable();
  assert(
    YTPlus.dataMin.config().on === true,
    "dataMin.enable() re-arms the master",
  );

  console.log("\n# Endpoints reference surface");
  const ep = YTPlus.dataMin.endpoints();
  assert(
    Array.isArray(ep.stats) && ep.stats.length > 0,
    "endpoints().stats is non-empty",
  );
  assert(
    Array.isArray(ep.logEvent) && ep.logEvent.length > 0,
    "endpoints().logEvent is non-empty",
  );
  assert(
    Array.isArray(ep.pagead) && ep.pagead.length > 0,
    "endpoints().pagead is non-empty",
  );
  assert(
    Array.isArray(ep.heartbeat) && ep.heartbeat.length > 0,
    "endpoints().heartbeat is non-empty",
  );

  console.log("\n# toggle() flips and refreshes");
  const before = YTPlus.dataMin.config().on;
  YTPlus.dataMin.toggle();
  const after = YTPlus.dataMin.config().on;
  assert(before !== after, "toggle() flips the master (was " + before + ", now " + after + ")");
  // Reset back to whatever the test started in
  YTPlus.dataMin.toggle();

  console.log("\n# Done.");
  console.log("Pass: " + pass + ", Fail: " + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error("Test runner error:", e && (e.stack || e.message || e));
  process.exit(1);
});
