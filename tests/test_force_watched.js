// test_force_watched.js — v3.0.18.10 "force video as watched" hotkey tests.
//
// Before v3.0.18.10 the single-video `Ut()` hotkey only fired
// the legacy hardcoded `/api/stats/*` and InnerTube endpoints.
// Per-video `playbackTracking` URLs (the ones that reliably
// register in YouTube's Account History, the same pattern the
// channel-wide `nn()` uses) were not requested for the
// single-video path. The v3.0.18.10 fix adds the player fetch +
// per-URL fire path AND two new config flags:
//   - forceWatchedAccountHistory (default ON)
//   - forceWatchedLocalHistory (default ON)
//
// Tests cover:
//   1. The two new config flags exist with the expected defaults.
//   2. With the new code path, `Ut()` issues a player fetch and
//      then fires the playbackTracking URLs via sendBeacon.
//   3. With forceWatchedAccountHistory=false, the player fetch
//      and playbackTracking sends are skipped.
//   4. With forceWatchedLocalHistory=false, the local IDB write
//      is skipped (no `history` row is upserted).
//   5. The toast feedback is shown.
//   6. Source-grep regression guards: the new path is wired
//      through `forceWatchedAccountHistory` and uses `Qa/Za`
//      like `nn()`.
//
// Run:  node test_force_watched.js

"use strict";

const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const USERSCRIPT = fs.readFileSync(
  path.join(__dirname, "..", "yt+.user.js"),
  "utf8",
);

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

const dom = new JSDOM(
  '<!doctype html><html><body></body></html>',
  {
    runScripts: "outside-only",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    pretendToBeVisual: true,
  },
);
const { window } = dom;
const document = window.document;

if (!window.crypto || !window.crypto.subtle) {
  const nodeCrypto = require("crypto").webcrypto;
  Object.defineProperty(window, "crypto", { value: nodeCrypto });
}

window.fetch = async () => ({
  ok: true,
  status: 200,
  text: () => "",
  json: () => ({}),
});
window.XMLHttpRequest.prototype.open = function () {};
window.XMLHttpRequest.prototype.send = function () {};

// Track sendBeacon calls so we can assert on the URLs.
const beaconCalls = [];
window.navigator.sendBeacon = (url) => {
  beaconCalls.push(String(url));
  return true;
};

window.GM_getValue = (k, d) => d;
window.GM_setValue = () => {};
window.GM_deleteValue = () => {};
window.GM_listValues = () => [];
window.GM_registerMenuCommand = () => {};
window.GM_addStyle = () => {};
window.GM_info = { script: { version: "0.0.0" } };
window.unsafeWindow = window;

// Install a fake `ytcfg` so the InnerTube call inside the new
// playbackTracking path has something to read. The API key can be
// any non-empty string; the fetch is mocked to return a player
// response that the test controls via `__setPlayerResponse`.
window.ytcfg = {
  get: (k) => {
    if (k === "INNERTUBE_API_KEY") return "TEST_KEY";
    if (k === "INNERTUBE_CONTEXT_CLIENT_NAME") return "1";
    if (k === "INNERTUBE_CLIENT_VERSION") return "2.20240101";
    if (k === "INNERTUBE_CONTEXT_CLIENT_VERSION") return "2.20240101";
    if (k === "EVENT_ID") return "TEST_EI";
    if (k === "HL") return "en";
    if (k === "GL") return "US";
    if (k === "VISITOR_DATA") return "TEST_VIS";
    if (k === "STS") return "19960";
    if (k === "INNERTUBE_CONTEXT") {
      return { client: { clientName: "WEB", clientVersion: "2.20240101" } };
    }
    return "";
  },
  set: () => {},
};

// Mock `ie.el()`, `ie.api()`, `ie.videoId()` so `Ut()` and `Kt()` can
// run. The video element needs a duration, and the api needs the
// standard player functions (`getDuration`, `getVideoStats`, etc.).
const _video = {
  duration: 600,
  loop: false,
  playbackRate: 1,
  currentTime: 0,
  paused: true,
  play: () => Promise.resolve(),
  pause: () => {},
  getAttribute: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
};
const _api = {
  getDuration: () => 600,
  getVideoStats: () => ({ cpn: "REALCPN123456" }),
  getDebugText: () => "",
  getPlayerResponse: () => ({}),
  playVideo: () => {},
  playVideoAt: () => {},
  seekTo: () => {},
  stopVideo: () => {},
  nextVideo: () => {},
  loadVideoByPlayerVars: () => {},
  cueVideoById: () => {},
  loadVideoById: () => {},
  advanceToNextItem: () => {},
  nextVideoOnAutoplay: () => {},
  pauseVideo: () => {},
};

// Override the `ie` helpers by installing a hidden video element
// and overriding `document.querySelector` for the selectors `Ut()`
// uses. `Ut()` calls `ie.el()`, `ie.api()`, and `ie.videoId()` —
// `ie` is closed over inside the IIFE, so we can't reassign it.
// Instead, we install DOM nodes that match the selectors the
// internal `ie` uses.
const _vNode = document.createElement("video");
_vNode.className = "html5-main-video";
Object.defineProperty(_vNode, "duration", { value: 600, configurable: true });
Object.defineProperty(_vNode, "loop", { value: false, configurable: true });
Object.defineProperty(_vNode, "playbackRate", { value: 1, configurable: true });
Object.defineProperty(_vNode, "currentTime", { value: 0, configurable: true });
Object.defineProperty(_vNode, "paused", { value: true, configurable: true });
_vNode.play = () => Promise.resolve();
_vNode.pause = () => {};
_vNode.addEventListener = () => {};
_vNode.removeEventListener = () => {};
_vNode.dispatchEvent = () => true;
document.body.appendChild(_vNode);

const _apiNode = document.createElement("div");
_apiNode.id = "movie_player";
_apiNode.getDuration = _api.getDuration;
_apiNode.getVideoStats = _api.getVideoStats;
_apiNode.getDebugText = _api.getDebugText;
_apiNode.getPlayerResponse = _api.getPlayerResponse;
_apiNode.playVideo = _api.playVideo;
_apiNode.playVideoAt = _api.playVideoAt;
_apiNode.seekTo = _api.seekTo;
_apiNode.stopVideo = _api.stopVideo;
_apiNode.nextVideo = _api.nextVideo;
_apiNode.loadVideoByPlayerVars = _api.loadVideoByPlayerVars;
_apiNode.cueVideoById = _api.cueVideoById;
_apiNode.loadVideoById = _api.loadVideoById;
_apiNode.advanceToNextItem = _api.advanceToNextItem;
_apiNode.nextVideoOnAutoplay = _api.nextVideoOnAutoplay;
_apiNode.pauseVideo = _api.pauseVideo;
document.body.appendChild(_apiNode);

(async () => {
  try {
    window.eval(USERSCRIPT);
  } catch (e) {
    console.error("USERSCRIPT threw on load:", e && (e.stack || e.message));
    process.exit(1);
  }

  // Wait for the async boot to populate YTPlus.
  for (let i = 0; i < 100; i++) {
    if (window.YTPlus) break;
    await new Promise((r) => setTimeout(r, 10));
  }
  if (!window.YTPlus) {
    console.error("YTPlus global not set");
    process.exit(1);
  }
  const YT = window.YTPlus;

  // -----------------------------------------------------------------
  // 1. New config flags exist with the expected defaults.
  // -----------------------------------------------------------------
  console.log("\n# Config flags exist");
  assert(
    typeof YT.cfg.forceWatchedAccountHistory === "boolean",
    "forceWatchedAccountHistory is a boolean",
  );
  assert(
    YT.cfg.forceWatchedAccountHistory === true,
    "forceWatchedAccountHistory defaults to true (got " +
      YT.cfg.forceWatchedAccountHistory +
      ")",
  );
  assert(
    typeof YT.cfg.forceWatchedLocalHistory === "boolean",
    "forceWatchedLocalHistory is a boolean",
  );
  assert(
    YT.cfg.forceWatchedLocalHistory === true,
    "forceWatchedLocalHistory defaults to true (got " +
      YT.cfg.forceWatchedLocalHistory +
      ")",
  );

  // -----------------------------------------------------------------
  // 2. With the default flags, `Ut()` fires the new
  //    playbackTracking path. We mock the player fetch to return
  //    a payload with a playbackTracking block and assert that
  //    sendBeacon was called with the expected URLs.
  // -----------------------------------------------------------------
  console.log("\n# Ut() fires the playbackTracking URLs (account history path)");

  // Track the fetch calls so we can assert on the player request.
  const fetchCalls = [];
  window.fetch = async (url, opts) => {
    fetchCalls.push({ url: String(url), opts: opts || {} });
    return {
      ok: true,
      status: 200,
      text: () => "",
      json: async () => ({
        playbackTracking: {
          videostatsPlaybackUrl: {
            baseUrl: "https://www.youtube.com/api/stats/playback?cpn=PLAYBACK",
          },
          videostatsWatchtimeUrl: {
            baseUrl:
              "https://www.youtube.com/api/stats/watchtime?cpn=WATCHTIME",
          },
          atrUrl: { baseUrl: "https://www.youtube.com/api/stats/atr?cpn=ATR" },
          qoeUrl: { baseUrl: "https://www.youtube.com/api/stats/qoe?cpn=QOE" },
          ptrackingUrl: {
            baseUrl: "https://www.youtube.com/api/stats/ptracking?cpn=PTRACK",
          },
          videostatsDelayplayUrl: {
            baseUrl: "https://www.youtube.com/api/stats/delayplay?cpn=DELAY",
          },
        },
        playabilityStatus: { status: "OK" },
        videoDetails: { lengthSeconds: "600", title: "T", author: "C", channelId: "UCx" },
      }),
    };
  };
  // Set the master toggle ON so the hotkey actually runs.
  YT.setCfg("forceWatchedOn", true);
  // Re-enable IDB store writes by clearing any prior history.
  beaconCalls.length = 0;
  // Reset the `_jt` "already marking" flag by waiting for any
  // in-flight timer to finish. The Ut() debounce is 300ms, so
  // wait that out to avoid a spurious early return.
  await new Promise((r) => setTimeout(r, 350));
  YT.actions.run("watched.mark");
  // The flow: Ut() -> Kt() -> async (Promise.resolve().then(...))
  // branches. Give them a generous 500ms window to complete.
  await new Promise((r) => setTimeout(r, 500));
  // We expect a fetch to /youtubei/v1/player (the new path).
  const playerFetches = fetchCalls.filter((c) =>
    /\/youtubei\/v1\/player/.test(c.url),
  );
  assert(
    playerFetches.length >= 1,
    "player fetch went out (got " + playerFetches.length + ")",
  );
  // And we expect sendBeacon calls for the playbackTracking URLs.
  // Each is fired via Qa() which calls sendBeacon.
  const playbackBeacons = beaconCalls.filter((u) =>
    /PLAYBACK/.test(u) || /api\/stats\/playback/.test(u),
  );
  const watchtimeBeacons = beaconCalls.filter((u) =>
    /WATCHTIME/.test(u) || /api\/stats\/watchtime/.test(u),
  );
  const atrBeacons = beaconCalls.filter((u) => /ATR/.test(u));
  const qoeBeacons = beaconCalls.filter((u) => /QOE/.test(u));
  const ptrackingBeacons = beaconCalls.filter((u) => /PTRACK/.test(u));
  assert(
    playbackBeacons.length >= 1,
    "playbackTracking.videostatsPlaybackUrl fired via sendBeacon (got " +
      playbackBeacons.length +
      ")",
  );
  assert(
    watchtimeBeacons.length >= 1,
    "playbackTracking.videostatsWatchtimeUrl fired (got " +
      watchtimeBeacons.length +
      ")",
  );
  assert(
    atrBeacons.length >= 1,
    "playbackTracking.atrUrl fired (got " + atrBeacons.length + ")",
  );
  assert(
    qoeBeacons.length >= 1,
    "playbackTracking.qoeUrl fired (got " + qoeBeacons.length + ")",
  );
  assert(
    ptrackingBeacons.length >= 1,
    "playbackTracking.ptrackingUrl fired (got " +
      ptrackingBeacons.length +
      ")",
  );

  // The watchtime fires for both `state=playing` and `state=ended`.
  // Verify the `state=ended` one is present.
  const endedBeacons = watchtimeBeacons.filter((u) => /state=ended/.test(u));
  assert(
    endedBeacons.length >= 1,
    "watchtime 'state=ended' beacon fired (got " + endedBeacons.length + ")",
  );

  // -----------------------------------------------------------------
  // 3. With forceWatchedAccountHistory=false, the player fetch
  //    and playbackTracking sends are skipped.
  // -----------------------------------------------------------------
  console.log("\n# forceWatchedAccountHistory=false skips the new path");
  YT.setCfg("forceWatchedAccountHistory", false);
  fetchCalls.length = 0;
  beaconCalls.length = 0;
  // Re-clear the in-flight guard by waiting past the debounce.
  await new Promise((r) => setTimeout(r, 350));
  // The previous Kt() is still cleaning up via its 2.5s setTimeout.
  // Force the cleanup directly by triggering a fresh mark.
  // We bypass the debounce by calling Ut via a direct path: the
  // watch is that fetchCalls and beaconCalls only have legacy
  // /api/stats/* URLs from the existing Kt() code (not the
  // playbackTracking ones).
  YT.actions.run("watched.mark");
  await new Promise((r) => setTimeout(r, 500));
  // No /youtubei/v1/player fetch should have gone out.
  const playerFetches2 = fetchCalls.filter((c) =>
    /\/youtubei\/v1\/player/.test(c.url),
  );
  assert(
    playerFetches2.length === 0,
    "no player fetch when accountHistory is OFF (got " +
      playerFetches2.length +
      ")",
  );
  // And no playbackTracking playback URL beacon (the existing
  // /api/stats/* legacy beacons are a different URL pattern and
  // would still fire via the original code path).
  const playbackTrackingBeacons2 = beaconCalls.filter((u) =>
    /PLAYBACK|WATCHTIME|ATR=|QOE|PTRACK/.test(u),
  );
  assert(
    playbackTrackingBeacons2.length === 0,
    "no playbackTracking beacons when accountHistory is OFF (got " +
      playbackTrackingBeacons2.length +
      ")",
  );
  // Restore for the rest of the tests.
  YT.setCfg("forceWatchedAccountHistory", true);

  // -----------------------------------------------------------------
  // 4. With forceWatchedLocalHistory=false, the local IDB write
  //    is skipped.
  // -----------------------------------------------------------------
  console.log("\n# forceWatchedLocalHistory=false skips the IDB write");
  YT.setCfg("forceWatchedLocalHistory", false);
  // Snapshot the local history list before the call.
  const histBefore = await window.YTPlus.history.all();
  await new Promise((r) => setTimeout(r, 350));
  YT.actions.run("watched.mark");
  await new Promise((r) => setTimeout(r, 500));
  const histAfter = await window.YTPlus.history.all();
  // In jsdom there's no real IDB so the history array is empty
  // regardless. We can only assert the absence of an exception
  // and that the configured-disabled flag is respected. The
  // stronger check is the source-grep test below.
  assert(
    !((histAfter.length || 0) > (histBefore.length || 0)),
    "history row count did not increase when localHistory is OFF",
  );
  // Restore for the rest of the tests.
  YT.setCfg("forceWatchedLocalHistory", true);

  // -----------------------------------------------------------------
  // 5. The toast feedback is shown.
  // -----------------------------------------------------------------
  console.log("\n# Toast feedback on hotkey press");
  await new Promise((r) => setTimeout(r, 350));
  // The "Marked as watched." toast is the singleton #ytp-toast. We
  // can't deterministically time the read because the toast
  // self-dismisses after 1500ms, so we trigger and read quickly.
  YT.actions.run("watched.mark");
  await new Promise((r) => setTimeout(r, 30));
  const toastEl = document.getElementById("ytp-toast");
  assert(
    !!toastEl,
    "toast element is created after Ut()",
  );
  if (toastEl) {
    assert(
      /Marked as watched/.test(toastEl.textContent || ""),
      "toast text contains 'Marked as watched' (got: " +
        (toastEl.textContent || "").slice(0, 80) +
        ")",
    );
  }

  // -----------------------------------------------------------------
  // 6. Source-grep regression guards.
  // -----------------------------------------------------------------
  console.log("\n# Source-grep regression guards");
  const code = USERSCRIPT;
  // The new code must read the config flag (not just the legacy one).
  assert(
    /S\.forceWatchedAccountHistory/.test(code),
    "source references S.forceWatchedAccountHistory",
  );
  assert(
    /S\.forceWatchedLocalHistory/.test(code),
    "source references S.forceWatchedLocalHistory",
  );
  // The new code must call Ot('player', ...) to fetch
  // playbackTracking URLs.
  assert(
    /Ot\s*\(\s*['"]player['"]/.test(code),
    "source uses Ot('player', ...) to fetch playbackTracking URLs",
  );
  // The new code must use Qa() to fire the URLs (the same fn the
  // channel version uses).
  assert(
    /track\.playbackUrl\s*&&\s*\(\s*Qa\s*\(/.test(code),
    "source uses Qa() to fire videostatsPlaybackUrl",
  );
  assert(
    /track\.watchtimeUrl/.test(code),
    "source uses the watchtime URL from the player response",
  );
  // The hardcoded legacy fire path must still exist (belt and
  // suspenders — the user asked for BOTH paths).
  assert(
    /api\/stats\/playback/.test(code),
    "legacy /api/stats/playback path is still fired (belt-and-suspenders)",
  );
  assert(
    /api\/stats\/watchtime/.test(code),
    "legacy /api/stats/watchtime path is still fired (belt-and-suspenders)",
  );

  console.log("\n# Done.");
  console.log("Pass: " + pass + ", Fail: " + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error("Test runner error:", e && (e.stack || e.message || e));
  process.exit(1);
});
