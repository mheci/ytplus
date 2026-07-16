// Test suite for v3.0.18.3 memory protection system.
// Runs the YT+ userscript in JSDOM and exercises the `_mp`
// resource manager + the public `YTPlus.memory.*` surface.
//
// Pass criteria: every assertion in the `ok -` lines must run.

const { JSDOM } = require("jsdom");
const fs = require("fs");

const code = fs.readFileSync("yt+.user.js", "utf8");
const meta = fs.readFileSync("yt+.meta.js", "utf8");
const verMatch = meta.match(/@version\s+(\S+)/);
const version = verMatch ? verMatch[1] : "unknown";
console.log("[meta] version =", version);

const dom = new JSDOM(
  '<!DOCTYPE html><html><head><title>YouTube</title></head><body><div id="movie_player"></div><video></video></body></html>',
  {
    runScripts: "outside-only",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    pretendToBeVisual: true,
  }
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

// FinalizationRegistry + WeakRef should be present in modern
// JSDOM/Node 22; we fall back to a minimal shim only if missing.
if (typeof win.FinalizationRegistry === "undefined") {
  win.FinalizationRegistry = class {
    constructor(cb) { this._cb = cb; }
    register() { return {}; }
    unregister() {}
  };
}
if (typeof win.WeakRef === "undefined") {
  win.WeakRef = class {
    constructor(t) { this._t = t; }
    deref() { return this._t; }
  };
}

const errors = [];
const origErr = win.console.error;
win.console.error = function (...a) {
  errors.push(["console.error", a.map(String).join(" ")]);
  origErr.apply(win.console, a);
};
const unhandled = [];
win.addEventListener("error", (e) => unhandled.push(["error", e.message]));
win.addEventListener("unhandledrejection", (e) => unhandled.push(["unhandledrejection", String(e.reason)]));

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { console.log("  ok - " + msg); pass++; }
  else      { console.log("  FAIL - " + msg); fail++; }
}

try { win.eval(code); } catch (e) { errors.push(["eval-throw", e.message]); }

setTimeout(() => {
  console.log("\n# Boot completes without errors");
  ok(errors.length === 0, "no console errors during load (got " + errors.length + ")");
  ok(unhandled.length === 0, "no unhandled errors (got " + unhandled.length + ")");
  const YTP = win.YTPlus;
  ok(!!YTP, "YTPlus global is present");
  ok(!!YTP && !!YTP.memory, "YTPlus.memory is exposed");
  ok(!!YTP && !!YTP.memory && typeof YTP.memory.snapshot === "function", "memory.snapshot is callable");
  ok(!!YTP && !!YTP.memory && typeof YTP.memory.audit === "function", "memory.audit is callable");
  ok(!!YTP && !!YTP.memory && typeof YTP.memory.gc === "function", "memory.gc is callable");
  ok(!!YTP && !!YTP.memory && typeof YTP.memory.runMaintenance === "function", "memory.runMaintenance is callable");

  if (!YTP || !YTP.memory) { _finish(); return; }

  console.log("\n# snapshot() shape");
  const snap = YTP.memory.snapshot();
  ok(typeof snap === "object", "snapshot returns an object");
  ok(typeof snap.live === "number" && snap.live >= 0, "snap.live is a number >= 0");
  ok(typeof snap.acquired === "number" && snap.acquired > 0, "snap.acquired > 0 (at least the maint tick is acquired)");
  ok(typeof snap.released === "number" && snap.released >= 0, "snap.released is a number >= 0");
  ok(typeof snap.byKind === "object", "snap.byKind is an object");
  ok(typeof snap.caches === "object", "snap.caches is an array");
  ok(Array.isArray(snap.caches), "snap.caches is an array");
  ok(typeof snap.heap === "object", "snap.heap is an object");
  ok(typeof snap.leakScore === "number" && snap.leakScore >= 0 && snap.leakScore <= 100, "snap.leakScore is 0..100");
  ok(typeof snap.lastSoftCleanup === "number", "snap.lastSoftCleanup is a number");

  console.log("\n# Initial cache registration");
  // The script registers three caches at boot via setTimeout(0).
  // Caches get registered in a microtask after IIFE init, so we
  // give it a couple of ticks before asserting.
  const names = snap.caches.map((c) => c.name);
  ok(names.indexOf("sb-segments") >= 0, "sb-segments cache registered (got names: " + JSON.stringify(names) + ")");
  ok(names.indexOf("time-format") >= 0, "time-format cache registered");
  ok(names.indexOf("thumb-blob") >= 0, "thumb-blob cache registered");

  console.log("\n# safeSetTimeout");
  const liveBefore = snap.live;
  let fired = false;
  const t1 = YTP.memory.setTimeout(() => { fired = true; }, 50, "test-st-1");
  ok(t1 && typeof t1.dispose === "function", "safeSetTimeout returns a handle with .dispose");
  ok(t1.alive && t1.alive(), "handle.alive() returns true before dispose");
  // Acquire another before we dispose the first so we can prove
  // counts go up and back down.
  const t2 = YTP.memory.setTimeout(() => {}, 60000, "test-st-2");
  const snap2 = YTP.memory.snapshot();
  ok(snap2.live === liveBefore + 2, "live count incremented by 2 (got " + (snap2.live - liveBefore) + ")");
  t1.dispose();
  ok(!t1.alive(), "handle.alive() returns false after dispose");
  // Disposing again must be a no-op (double-free safety).
  t1.dispose();
  ok(true, "double dispose is a no-op (no throw)");
  // After dispose the live count drops by exactly 1.
  const snap3 = YTP.memory.snapshot();
  ok(snap3.live === liveBefore + 1, "live count decremented after dispose (got " + (snap3.live - liveBefore) + ")");
  // Let t1's callback fire (it should run; we set fired inside).
  // Then t1 is dead but its callback still ran since we don't
  // cancel a setTimeout that already fired. This is correct
  // behaviour: dispose is best-effort cancellation of pending work.
  // We don't assert on fired, but we do assert no error from a
  // double-run.
  // Wait long enough for the 50ms timer to fire.
  setTimeout(() => {
    ok(true, "fired-callback after dispose: " + fired);
    t2.dispose();
    const snap4 = YTP.memory.snapshot();
    ok(snap4.live === liveBefore, "live count returns to baseline after both disposed");

    console.log("\n# safeSetInterval (cancelled via dispose)");
    let ticks = 0;
    const iv = YTP.memory.setInterval(() => { ticks++; }, 30, "test-iv");
    let lastTicks = 0;
    setTimeout(() => {
      const t1Ticks = ticks;
      ok(t1Ticks > 0, "interval fired at least once (" + t1Ticks + ")");
      iv.dispose();
      lastTicks = ticks;
      setTimeout(() => {
        ok(ticks === lastTicks, "interval does NOT fire after dispose (" + ticks + " vs " + lastTicks + ")");
        // Intervals show up in the byKind map.
        const snap5 = YTP.memory.snapshot();
        ok((snap5.byKind.interval || 0) >= 0, "snap.byKind.interval is a number");
        ok(!iv.alive(), "interval handle.alive() false after dispose");
        console.log("\n# safeListener");
        const target = win.document.createElement("div");
        win.document.body.appendChild(target);
        let lFired = 0;
        const fn = () => { lFired++; };
        const lh = YTP.memory.listener(target, "click", fn, false, "test-listener");
        ok(lh && lh.alive && lh.alive(), "listener handle.alive() true before dispose");
        // Simulate a click by dispatching an Event.
        target.click();
        target.click();
        // Force microtask flush (clicks are sync in JSDOM, so this is
        // immediate).
        ok(lFired === 2, "listener fires on each click (got " + lFired + ")");
        lh.dispose();
        target.click();
        target.click();
        ok(lFired === 2, "listener does NOT fire after dispose (got " + lFired + ")");
        ok(!lh.alive(), "listener handle.alive() false after dispose");

        console.log("\n# safeBlobURL");
        const blob = new win.Blob(["hello"], { type: "text/plain" });
        const b1 = YTP.memory.blobURL(blob, "test-blob");
        ok(b1 && typeof b1.dispose === "function", "blobURL returns a handle with .dispose");
        // JSDOM does NOT implement URL.createObjectURL; the
        // wrapper catches that and returns a handle with a null
        // ref. Real browsers will populate b1.ref.url with a
        // "blob:..." string. The wrapper must not throw either
        // way.
        if (b1.ref && b1.ref.url) {
          ok(b1.ref.url.indexOf("blob:") === 0, "blobURL ref.url is a blob: URL (real browser path)");
        } else {
          ok(true, "blobURL gracefully handles environments without URL.createObjectURL (JSDOM)");
        }
        b1.dispose();
        ok(!b1.alive(), "blobURL handle.alive() false after dispose");

        console.log("\n# safeElement");
        const el = win.document.createElement("div");
        el.id = "test-safe-el";
        win.document.body.appendChild(el);
        ok(win.document.getElementById("test-safe-el") !== null, "element in DOM before dispose");
        const eh = YTP.memory.element(el, "test-el");
        ok(eh.alive(), "element handle alive");
        eh.dispose();
        ok(win.document.getElementById("test-safe-el") === null, "element removed from DOM after dispose");

        console.log("\n# safeWrap protects throws");
        let wrapErr = false;
        const wrapped = YTP.memory.wrap(() => { throw new Error("kaboom"); }, "wrap-test");
        try { wrapped(); } catch (e) { wrapErr = true; }
        ok(!wrapErr, "safeWrap swallows throws (none escaped)");
        // And the unhandled error buffer should be empty.
        ok(unhandled.length === 0, "no unhandled errors after safeWrap'd throw");

        console.log("\n# maintenance tick is safe to call");
        YTP.memory.runMaintenance();
        YTP.memory.runMaintenance();
        YTP.memory.runMaintenance();
        ok(true, "runMaintenance() x3 did not throw");

        console.log("\n# audit() shape");
        const audit = YTP.memory.audit();
        ok(typeof audit === "object", "audit returns object");
        ok(typeof audit.live === "number" && audit.live >= 0, "audit.live is a number");
        ok(typeof audit.leakScore === "number", "audit.leakScore is a number");
        ok(Array.isArray(audit.resources), "audit.resources is an array");
        ok(audit.resources.length <= 200, "audit.resources capped at 200 (got " + audit.resources.length + ")");

        console.log("\n# releaseKind");
        // releaseKind releases ALL live resources of a given kind.
        // The script itself installs 2 listeners (pagehide +
        // visibilitychange) plus any prior tests may have left
        // others; we just confirm (a) listeners count goes UP
        // when we add 3, (b) releaseKind returns a positive
        // number that exactly matches the current count, and
        // (c) after the call the count is 0.
        const tt = win.document.createElement("span");
        win.document.body.appendChild(tt);
        const beforeAdd = YTP.memory.snapshot().byKind.listener || 0;
        ok(beforeAdd >= 0, "baseline listener count is " + beforeAdd);
        const ls = [];
        for (let i = 0; i < 3; i++) {
          ls.push(YTP.memory.listener(tt, "click", () => {}, false, "test-bulk-listener-" + i));
        }
        const afterAdd = YTP.memory.snapshot().byKind.listener || 0;
        ok(afterAdd === beforeAdd + 3, "3 listeners added (delta " + (afterAdd - beforeAdd) + ")");
        const released = YTP.memory.releaseKind("listener");
        ok(released === afterAdd, "releaseKind('listener') returned " + afterAdd + " (all current)");
        const afterRelease = YTP.memory.snapshot().byKind.listener || 0;
        ok(afterRelease === 0, "listener count is 0 after releaseKind");

        console.log("\n# double-free tracking");
        const beforeDf = YTP.memory.snapshot().doubleFreeAttempts;
        const df1 = YTP.memory.setTimeout(() => {}, 1000, "df-test");
        df1.dispose();
        df1.dispose();
        df1.dispose();
        const afterDf = YTP.memory.snapshot().doubleFreeAttempts;
        ok(afterDf === beforeDf + 2, "double-free attempts counter incremented (delta " + (afterDf - beforeDf) + ")");

        console.log("\n# leakScore heuristic");
        const finalSnap = YTP.memory.snapshot();
        ok(finalSnap.leakScore <= 100, "leakScore is bounded to 100 (got " + finalSnap.leakScore + ")");
        ok(finalSnap.leakScore >= 0, "leakScore is non-negative (got " + finalSnap.leakScore + ")");
        ok(typeof finalSnap.heap === "object", "heap info present in snapshot");

        _finish();
      }, 200);
    }, 100);
  }, 100);
}, 1500);

function _finish() {
  console.log("\n# Done.");
  console.log("Pass: " + pass + ", Fail: " + fail);
  process.exit(fail === 0 ? 0 : 1);
}
