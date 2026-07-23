// === YT+ OPTIMIZED MINIMAL BOOTSTRAP (drop-in replacement concept) ===
// Place at the very top of the IIFE, after strict + loaded guard.
// Full feature registration + apply moves to deferred fullInit().

(() => {
  "use strict";
  const unsafe = (typeof unsafeWindow !== "undefined") ? unsafeWindow : window;
  if (unsafe.__YTPLUS_LOADED__) return;
  unsafe.__YTPLUS_LOADED__ = true;

  const __pristine = {
    XHROpen: XMLHttpRequest.prototype.open,
    XHRSend: XMLHttpRequest.prototype.send,
    fetch: unsafe.fetch,
    beacon: navigator.sendBeacon
  };

  // Early kill-switch + TrustedTypes remain exactly as original (omitted for brevity)

  // === MEMORY MANAGER (_mp) stays exactly as-is (excellent) ===

  let __initScheduled = false;

  function scheduleFullInit() {
    if (__initScheduled) return;
    __initScheduled = true;

    const run = () => {
      try {
        // === ALL ORIGINAL CODE FROM "let S = ..." to end of file ===
        // (config, IDB, xa.register x115, theme engine, SB, hotkeys, etc.)
        // moved here verbatim
        fullInitCore();
      } catch (err) {
        console.warn("[YT+] deferred init error", err);
      }
    };

    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: 1200 });
    } else {
      setTimeout(run, 120);
    }
  }

  // Schedule immediately (non-blocking)
  scheduleFullInit();

  // Optional: also trigger on first yt-navigate-finish if idle missed
  document.addEventListener("yt-navigate-finish", () => {
    if (!unsafe.__YTPLUS_FULLY_INITIALIZED__) scheduleFullInit();
  }, { once: true, capture: true });

  function fullInitCore() {
    if (unsafe.__YTPLUS_FULLY_INITIALIZED__) return;
    unsafe.__YTPLUS_FULLY_INITIALIZED__ = true;

    // === PASTE ALL ORIGINAL INITIALIZATION CODE HERE ===
    // (S, xa, ua, theme, 115 xa.register calls, global listeners, etc.)

    // After original code, ensure:
    // initCentralYTObserver();
    // installGlobalHotkeyListener();
    // xa.applyAll();   // now runs after idle / nav
  }
})();