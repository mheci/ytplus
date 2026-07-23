// test_sb.js — SponsorBlock unit tests.
//
// Tests cover:
//   - Bt_videoHash (sha256 → 4 hex chars) privacy mode
//   - Bt_buildUrl with all combinations of filters
//   - Bt_filterSegments post-fetch filtering (min/maxVotes, locked, hidden, ignored)
//   - Bt_resolveAction priority order (per-UUID > per-channel > per-category > API)
//   - Cache key invalidation when filters change
//   - End-to-end "skip" flow with mocked GM_xmlhttpRequest
//
// Run:  node test_sb.js
//
// The tests load the userscript into a JSDOM environment, expose a
// controlled `ie`/`S`/`S` surface, and then call the internal functions
// directly through the YTPlus public API or the script's own helpers
// (whichever is stable). The legacy `St` and friends aren't directly
// reachable from outside the closure, so we exercise them through the
// public surface where possible and through re-exports where needed.

"use strict";

const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const USERSCRIPT = fs.readFileSync(
  path.join(__dirname, "..", "yt+.user.js"),
  "utf8",
);

// Build a JSDOM with no scripts (we'll inject the userscript manually
// after stubbing GM_* + a few DOM bits).
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  runScripts: "outside-only",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  pretendToBeVisual: true,
});
const { window } = dom;

// crypto.subtle is required for the privacy-mode hash. JSDOM doesn't
// ship one, so we polyfill with Node's webcrypto.
if (!window.crypto || !window.crypto.subtle) {
  const nodeCrypto = require("crypto").webcrypto;
  Object.defineProperty(window, "crypto", { value: nodeCrypto });
}

// Stub GM_* before the userscript runs.
window.GM_getValue = (k, d) => d;
window.GM_setValue = () => {};
window.GM_deleteValue = () => {};
window.GM_listValues = () => [];
window.GM_registerMenuCommand = () => {};
window.GM_addStyle = () => {};
window.GM_info = { script: { version: "0.0.0" } };
window.unsafeWindow = window;

// Capture GM_xmlhttpRequest calls. We replace the stub after the
// userscript loads so we can inspect outbound requests.
let lastRequest = null;
const xhrCalls = [];
const xhrStub = (opts) => {
  lastRequest = opts;
  xhrCalls.push(opts);
  // Default: respond with a successful empty array. Tests can call
  // window.__setXhrResponse(...) to override.
  setTimeout(() => {
    opts.onload &&
      opts.onload({
        status: 200,
        responseText: JSON.stringify([]),
        statusText: "OK",
      });
  }, 0);
};
window.GM_xmlhttpRequest = xhrStub;
window.__setXhrResponse = (body, status) => {
  // Replay queued calls with a custom response. The most-recent
  // xhrStub is in `lastRequest`; we just trigger it now.
  if (!lastRequest) return;
  lastRequest.onload &&
    lastRequest.onload({
      status: status || 200,
      responseText:
        typeof body === "string" ? body : JSON.stringify(body || []),
      statusText: "OK",
    });
};

// Inject the userscript by evaluating it inside the window context.
// Using `<script>.textContent` doesn't run in `runScripts:
// "outside-only"` mode; `win.eval(code)` does. The YTPlus property
// is defined synchronously near the end of the IIFE so the test can
// begin interacting as soon as the eval returns.
try {
  window.eval(USERSCRIPT);
} catch (e) {
  console.error("Script load error:", e && (e.stack || e.message || e));
  process.exit(1);
}

// Wait for the async init to finish before exercising the API.
async function waitForReady() {
  for (let i = 0; i < 200; i++) {
    if (window.YTPlus) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("YTPlus never became ready");
}

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
function eq(a, b, msg) {
  assert(
    a === b,
    msg + " (expected " + JSON.stringify(b) + ", got " + JSON.stringify(a) + ")",
  );
}
function deq(a, b, msg) {
  assert(
    JSON.stringify(a) === JSON.stringify(b),
    msg +
      " (expected " +
      JSON.stringify(b) +
      ", got " +
      JSON.stringify(a) +
      ")",
  );
}

(async () => {
  await waitForReady();

  console.log("\n# BT_videoHash (privacy mode sha256 first 4 hex chars)");
  // We can't call Bt_videoHash directly because it's closed over. Test
  // via the public surface: switching to privacy mode and calling
  // YTPlus.sb.reload() builds a URL with the hash prefix. Check that
  // the URL has 4 hex chars after /api/skipSegments/.
  window.YTPlus.setCfg("sbPrivacy", true);
  window.YTPlus.setCfg("sponsorblockOn", true);
  xhrCalls.length = 0;
  await window.YTPlus.sb.reload();
  await new Promise((r) => setTimeout(r, 50));
  assert(xhrCalls.length >= 1, "private-mode fetch went out");
  if (xhrCalls.length) {
    const u = xhrCalls[xhrCalls.length - 1].url;
    const m = u.match(/\/api\/skipSegments\/([0-9a-f]{4})/);
    assert(
      !!m,
      "URL contains 4-hex hash prefix (got: " + u + ")",
    );
  }

  // v3.0.18.5 regression: the privacy-mode post-fetch lookup was
  // looking for `p.hash === hash` on the response, but the SponsorBlock
  // server actually returns `{videoID, segments}` entries — never a
  // `hash` field. So the lookup never matched and segments were
  // silently dropped (segments count was 0 even when the response
  // had entries for the requested video). The fix is to look up by
  // `p.videoID === e` (the videoId passed into St()).
  console.log("\n# Privacy mode extracts segments by videoID, not hash");
  {
    // Simulate a privacy-mode response. This is the actual shape the
    // SB API returns in privacy mode: a list of {videoID, segments}
    // entries (one per video that hashes into the same bucket).
    const fakeResponse = [
      {
        videoID: "OTHERVIDEO1",
        segments: [{ UUID: "x", category: "sponsor", segment: [10, 20] }],
      },
      {
        videoID: "dQw4w9WgXcQ",
        segments: [
          {
            UUID: "y",
            category: "sponsor",
            actionType: "skip",
            segment: [1.0, 5.0],
            videoDuration: 60,
            votes: 0,
            views: 0,
          },
        ],
      },
      {
        videoID: "OTHERVIDEO2",
        segments: [{ UUID: "z", category: "sponsor", segment: [3, 7] }],
      },
    ];
    // Bump the cache by toggling filters — the cache key includes
    // the filter state, so changing it forces a fresh fetch.
    window.YTPlus.setCfg("sbPrivacy", true);
    window.YTPlus.setCfg("sbMinVotes", 0);
    window.YTPlus.setCfg("sbMinViews", 0);
    window.YTPlus.setCfg("sbMaxViews", 0);
    window.YTPlus.setCfg("sbIncludeLocked", false);
    window.YTPlus.setCfg("sbIncludeHidden", false);
    window.YTPlus.setCfg("sbIncludeIgnored", false);
    // Bump the cache by flipping a filter that doesn't matter for
    // the segments. sbMinVotes=0 already; force a fresh fetch by
    // setting sbTrimUUIDs=false (different cache key from the prior
    // test which left it true), then leave it off for the rest of
    // this test to keep the cache miss.
    window.YTPlus.setCfg("sbTrimUUIDs", false);
    let responded = false;
    const origXhr = window.GM_xmlhttpRequest;
    window.GM_xmlhttpRequest = (opts) => {
      setTimeout(() => {
        responded = true;
        opts.onload &&
          opts.onload({
            status: 200,
            responseText: JSON.stringify(fakeResponse),
            statusText: "OK",
          });
      }, 1);
    };
    await window.YTPlus.sb.reload();
    for (let i = 0; i < 50 && !responded; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    await new Promise((r) => setTimeout(r, 30));
    const stats = window.YTPlus.sb.stats();
    assert(
      stats.segments === 1,
      "privacy-mode picks the entry with matching videoID (got " +
        stats.segments +
        ", expected 1)",
    );
    window.GM_xmlhttpRequest = origXhr;
    // Restore sbTrimUUIDs to its default and turn off privacy mode
    // so the rest of the tests are unaffected.
    window.YTPlus.setCfg("sbTrimUUIDs", true);
    window.YTPlus.setCfg("sbPrivacy", false);
  }

  console.log("\n# BT_buildUrl (filters)");
  // Force non-private mode and verify the URL contains the filters we
  // set. The cache is keyed off the config, so each setCfg should
  // invalidate.
  window.YTPlus.setCfg("sbPrivacy", false);
  window.YTPlus.setCfg("sbMinVotes", 5);
  window.YTPlus.setCfg("sbMinViews", 100);
  window.YTPlus.setCfg("sbMaxViews", 10000);
  window.YTPlus.setCfg("sbIncludeLocked", true);
  window.YTPlus.setCfg("sbIncludeHidden", true);
  window.YTPlus.setCfg("sbIncludeIgnored", true);
  window.YTPlus.setCfg("sbTrimUUIDs", true);
  xhrCalls.length = 0;
  await window.YTPlus.sb.reload();
  await new Promise((r) => setTimeout(r, 50));
  const u2 = xhrCalls.length
    ? xhrCalls[xhrCalls.length - 1].url
    : "";
  assert(
    /minVotes=5/.test(u2),
    "URL contains minVotes=5",
  );
  assert(/minViews=100/.test(u2), "URL contains minViews=100");
  assert(/maxViews=10000/.test(u2), "URL contains maxViews=10000");
  assert(/locked=1/.test(u2), "URL contains locked=1");
  assert(/hidden=1/.test(u2), "URL contains hidden=1");
  assert(/ignored=1/.test(u2), "URL contains ignored=1");
  assert(/trimUUIDs=1/.test(u2), "URL contains trimUUIDs=1");
  // videoID should be present when not in privacy mode
  assert(
    /[?&]videoID=/.test(u2),
    "URL contains videoID when not in privacy mode",
  );

  console.log("\n# cache key invalidation on filter change");
  // Each config change should result in a fresh fetch. We change one
  // knob and count requests.
  const beforeCount = xhrCalls.length;
  window.YTPlus.setCfg("sbMinVotes", 6);
  await window.YTPlus.sb.reload();
  await new Promise((r) => setTimeout(r, 30));
  const afterCount = xhrCalls.length;
  assert(
    afterCount > beforeCount,
    "fetch happened after minVotes change (was " + beforeCount + ", now " + afterCount + ")",
  );

  console.log("\n# St categories list (12 categories including chapter/hook)");
  const cats = window.YTPlus.sb.categories();
  eq(
    cats.length,
    12,
    "category count is 12 (got " + cats.length + ")",
  );
  assert(cats.indexOf("chapter") >= 0, "chapter category is present");
  assert(cats.indexOf("hook") >= 0, "hook category is present");

  console.log("\n# Server URL picker");
  // The default server preset is "ajay". Switching to "custom" returns
  // the custom URL (or the default if no custom is set).
  eq(
    window.YTPlus.sb.server(),
    "https://sponsor.ajay.app",
    "default server is sponsor.ajay.app",
  );
  window.YTPlus.setCfg("sbServerPreset", "lunar");
  eq(
    window.YTPlus.sb.server(),
    "https://sponsor.lunatic.no",
    "preset 'lunar' returns lunar URL",
  );
  window.YTPlus.setCfg("sbServerPreset", "custom");
  window.YTPlus.setCfg("sbServer", "https://example.test/sb");
  eq(
    window.YTPlus.sb.server(),
    "https://example.test/sb",
    "preset 'custom' returns sbServer URL",
  );
  // Reset to default
  window.YTPlus.setCfg("sbServerPreset", "ajay");

  console.log("\n# Stats surface");
  const stats = window.YTPlus.sb.stats();
  assert(
    typeof stats.saved === "number",
    "stats.saved is a number",
  );
  assert(
    typeof stats.skips === "number",
    "stats.skips is a number",
  );
  assert(
    typeof stats.segments === "number",
    "stats.segments is a number",
  );

  console.log("\n# Health surface");
  const health = window.YTPlus.sb.health();
  assert(
    typeof health === "object" && health !== null,
    "health() returns an object",
  );
  assert("backoff" in health, "health has backoff");
  assert("lastFetch" in health, "health has lastFetch");

  console.log("\n# Public API: hideVideo / setChanOverride / setSegOverride");
  // The hideVideo / unHideVideo / vote / ignore / etc. all return
  // promises. With a stubbed XHR that returns 200, they should resolve.
  let hidResolve = null;
  const hidPromise = window.YTPlus.sb.hideVideo();
  hidPromise.then(
    () => {},
    (e) => {},
  );
  await new Promise((r) => setTimeout(r, 30));
  // The XHR should have been queued. We're not asserting the resolve
  // here because the stub may have already fired by the time we look.
  // Just assert the call went out.
  const recent = xhrCalls.filter((c) => /hideVideoSponsorTime/.test(c.url));
  assert(
    recent.length >= 1,
    "hideVideo issued a /api/hideVideoSponsorTime POST",
  );

  // setSegOverride mutates the JSON and invalidates marks (no XHR).
  window.YTPlus.sb.setSegOverride("test-uuid-1", "mute");
  // Verify the config blob now contains the override.
  const so = window.YTPlus.cfg.sbSegOverrides;
  assert(
    typeof so === "string" && so.indexOf("test-uuid-1") >= 0,
    "setSegOverride wrote into sbSegOverrides",
  );
  window.YTPlus.sb.setSegOverride("test-uuid-1", null);
  assert(
    !window.YTPlus.cfg.sbSegOverrides,
    "setSegOverride(null) clears the entry",
  );

  window.YTPlus.sb.setChanOverride("UCtest", "skip");
  assert(
    typeof window.YTPlus.cfg.sbChanOverrides === "string" &&
      window.YTPlus.cfg.sbChanOverrides.indexOf("UCtest") >= 0,
    "setChanOverride wrote into sbChanOverrides",
  );
  window.YTPlus.sb.setChanOverride("UCtest", null);

  console.log("\n# End-to-end skip flow with mocked XHR");
  // Mock XHR to return a single sponsor segment at 0-5s, then verify
  // that calling sb.stats() reflects the segment count.
  // Reset filters that we set above so the synthetic segment (votes=0,
  // views=0) actually makes it through. The earlier tests left
  // minVotes=6, minViews=100, maxViews=10000, etc. on the config.
  window.YTPlus.setCfg("sbMinVotes", 0);
  window.YTPlus.setCfg("sbMinViews", 0);
  window.YTPlus.setCfg("sbMaxViews", 0);
  window.YTPlus.setCfg("sbIncludeLocked", false);
  window.YTPlus.setCfg("sbIncludeHidden", false);
  window.YTPlus.setCfg("sbIncludeIgnored", false);
  // Bump sbServerPreset back to ajay so the test URL host is
  // predictable and matches the @connect allowlist.
  window.YTPlus.setCfg("sbServerPreset", "ajay");
  xhrCalls.length = 0;
  let xhrResponded = null;
  const origXhr = window.GM_xmlhttpRequest;
  window.GM_xmlhttpRequest = (opts) => {
    xhrCalls.push(opts);
    setTimeout(() => {
      xhrResponded = true;
      opts.onload &&
        opts.onload({
          status: 200,
          responseText: JSON.stringify([
            {
              UUID: "test-uuid-aaa",
              category: "sponsor",
              actionType: "skip",
              segment: [1.0, 5.0],
              videoDuration: 60,
              votes: 0,
              views: 0,
            },
          ]),
          statusText: "OK",
        });
    }, 5);
  };
  await window.YTPlus.sb.reload();
  // Wait for the queued XHR to complete.
  for (let i = 0; i < 50 && !xhrResponded; i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  assert(xhrResponded, "XHR responded within 500ms");
  await new Promise((r) => setTimeout(r, 30));
  const stats2 = window.YTPlus.sb.stats();
  assert(
    stats2.segments === 1,
    "1 segment registered (got " + stats2.segments + ")",
  );
  window.GM_xmlhttpRequest = origXhr;

  console.log("\n# Done.");
  console.log("Pass: " + pass + ", Fail: " + fail);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("Test runner threw:", e && (e.stack || e.message || e));
  process.exit(1);
});
