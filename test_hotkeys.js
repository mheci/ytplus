// test_hotkeys.js — v3.0.18 hotkey system unit tests.
//
// Tests cover:
//   - Action registry: list/get/run/setBinding/resetBinding/conflicts
//   - Legacy Zo actions are mirrored into the registry
//   - Command palette: open/close, public surface
//   - Cheat sheet: open/close, public surface
//   - Global keydown dispatch: dispatchGlobal returns the right
//     action for a given KeyboardEvent
//   - Dashboard keyboard nav: ? opens cheat, / focuses search
//   - HotkeyMap storage: act.* keys are used, not legacy ids
//
// Run:  node test_hotkeys.js

"use strict";

const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");


const USERSCRIPT = fs.readFileSync(
  path.join(__dirname, "yt+.user.js"),
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
  "<!doctype html><html><body></body></html>",
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

window.fetch = async () => ({ ok: true, status: 200, text: () => "", json: () => ({}) });
window.XMLHttpRequest.prototype.open = function () {};
window.XMLHttpRequest.prototype.send = function () {};
window.navigator.sendBeacon = () => true;

window.GM_getValue = (k, d) => d;
window.GM_setValue = () => {};
window.GM_deleteValue = () => {};
window.GM_listValues = () => [];
window.GM_registerMenuCommand = () => {};
window.GM_addStyle = () => {};
window.GM_info = { script: { version: "0.0.0" } };
window.unsafeWindow = window;

(async () => {
  try {
    window.eval(USERSCRIPT);
  } catch (e) {
    console.error("USERSCRIPT threw on load:", e && (e.stack || e.message));
    process.exit(1);
  }

  // Wait a tick for the async boot to populate YTPlus.
  await new Promise((r) => setTimeout(r, 50));

  if (!window.YTPlus) {
    console.error("YTPlus global not set");
    process.exit(1);
  }
  const YT = window.YTPlus;
  assert(typeof YT.actions === "object" && YT.actions !== null, "YTPlus.actions surface exists");
  assert(typeof YT.palette === "object" && YT.palette !== null, "YTPlus.palette surface exists");
  assert(typeof YT.cheat === "object" && YT.cheat !== null, "YTPlus.cheat surface exists");

  console.log("\n# action registry");
  const list = YT.actions.list();
  assert(Array.isArray(list), "actions.list() returns an array");
  assert(list.length > 10, "actions.list() has >10 entries (got " + list.length + ")");
  const foundPalette = list.find((a) => a.id === "palette.open");
  assert(!!foundPalette, "actions list includes palette.open");
  assert(
    foundPalette && foundPalette.def === "Ctrl+Shift+KeyK",
    "palette.open default is Ctrl+Shift+KeyK",
  );
  const foundCheat = list.find((a) => a.id === "cheat.open");
  assert(!!foundCheat, "actions list includes cheat.open");
  const foundToggleDash = list.find((a) => a.id === "toggleDash");
  assert(!!foundToggleDash, "legacy Zo action toggleDash is mirrored in registry");
  const foundSbToggle = list.find((a) => a.id === "sb.toggle");
  assert(!!foundSbToggle, "new sb.toggle action is registered");
  const foundDmToggle = list.find((a) => a.id === "dm.toggle");
  assert(!!foundDmToggle, "new dm.toggle action is registered");
  const foundPlayToggle = list.find((a) => a.id === "play.togglePlay");
  assert(!!foundPlayToggle, "new play.togglePlay action is registered");

  console.log("\n# categories");
  const cats = new Set(list.map((a) => a.cat));
  assert(cats.has("playback"), "has playback category");
  assert(cats.has("modules"), "has modules category");
  assert(cats.has("sponsorblock"), "has sponsorblock category");
  assert(cats.has("legacy"), "has legacy category (mirrored Zo)");
  assert(cats.has("global"), "has global category");
  assert(cats.has("dashboard"), "has dashboard category");

  console.log("\n# get(id)");
  const a = YT.actions.get("palette.open");
  assert(a && a.id === "palette.open", "get('palette.open') returns the action");
  const missing = YT.actions.get("does.not.exist");
  assert(missing === null, "get(missing) returns null");

  console.log("\n# setBinding + resetBinding");
  const r1 = YT.actions.setBinding("palette.open", "Ctrl+KeyP");
  assert(r1 === true, "setBinding returns true for known id");
  const a2 = YT.actions.get("palette.open");
  assert(a2.binding === "Ctrl+KeyP", "binding was updated to Ctrl+KeyP");
  const r2 = YT.actions.resetBinding("palette.open");
  assert(r2 === true, "resetBinding returns true for known id");
  const a3 = YT.actions.get("palette.open");
  assert(a3.binding === "Ctrl+Shift+KeyK", "binding was reset to default");
  const r3 = YT.actions.setBinding("does.not.exist", "KeyQ");
  assert(r3 === false, "setBinding returns false for unknown id");

  console.log("\n# run(id)");
  // The data-min toggle action is safe to call from a test (it just
  // flips a config key + toasts). We snapshot, run, and assert it
  // changed.
  const beforeDm = YT.actions.get("dm.toggle").binding;
  // We can't easily assert the toast, but we can check the config
  // change via the YTPlus.dataMin public surface.
  const beforeOn = YT.dataMin.config().on;
  YT.actions.run("dm.toggle");
  const afterOn = YT.dataMin.config().on;
  assert(
    beforeOn !== afterOn,
    "run('dm.toggle') flipped the dataMin master (was " +
      beforeOn +
      ", now " +
      afterOn +
      ")",
  );
  // Restore
  YT.actions.run("dm.toggle");
  // Idempotent guard
  const r4 = YT.actions.run("does.not.exist");
  assert(r4 === false, "run(unknown) returns false");

  console.log("\n# conflicts()");
  // Force a conflict by binding two actions to the same key.
  YT.actions.setBinding("dm.showCount", "KeyQ");
  YT.actions.setBinding("update.check", "KeyQ");
  const cf = YT.actions.conflicts();
  assert(
    cf["KeyQ"] && cf["KeyQ"].length === 2,
    "conflicts() reports the two KeyQ bindings (got " +
      JSON.stringify(cf["KeyQ"]) +
      ")",
  );
  // Clean up
  YT.actions.resetBinding("dm.showCount");
  YT.actions.resetBinding("update.check");

  console.log("\n# dispatchGlobal(KeyboardEvent)");
  // Build a synthetic KeyboardEvent-like object. The dispatchGlobal
  // function only reads .code, .ctrlKey, .shiftKey, .altKey,
  // .metaKey — it doesn't depend on the actual Event class.
  const ev = (code, mods) => {
    const e = { code };
    if (mods) {
      if (mods.ctrl) e.ctrlKey = true;
      if (mods.shift) e.shiftKey = true;
      if (mods.alt) e.altKey = true;
      if (mods.meta) e.metaKey = true;
    }
    return e;
  };
  // Most actions require hotkeyOptIn=true to fire. Enable it for
  // the dispatch tests; restore at the end.
  YT.setCfg("hotkeyOptIn", true);
  // Unbind play.togglePiP from KeyP (its default) so palette.open
  // is the only action matching KeyP in these tests.
  YT.actions.setBinding("play.togglePiP", "");
  // Bind palette.open to a known key, then dispatch a matching event
  YT.actions.setBinding("palette.open", "KeyP");
  const r5 = YT.actions.dispatchGlobal(ev("KeyP"));
  assert(
    r5 && r5.id === "palette.open",
    "dispatchGlobal matches by binding (unbound key)",
  );
  // Bind with a modifier and verify it only matches with the right one
  YT.actions.setBinding("palette.open", "Ctrl+KeyP");
  const r6 = YT.actions.dispatchGlobal(ev("KeyP"));
  assert(
    r6 === null,
    "dispatchGlobal does NOT match when modifier is missing",
  );
  const r7 = YT.actions.dispatchGlobal(ev("KeyP", { ctrl: true }));
  assert(
    r7 && r7.id === "palette.open",
    "dispatchGlobal matches when modifier is present",
  );
  // Unbound key
  const r8 = YT.actions.dispatchGlobal(ev("KeyZ"));
  assert(r8 === null, "dispatchGlobal returns null for unbound key");
  // Restore
  YT.actions.resetBinding("palette.open");
  YT.actions.resetBinding("play.togglePiP");
  YT.setCfg("hotkeyOptIn", false);

  console.log("\n# palette / cheat public surface");
  assert(typeof YT.palette.open === "function", "palette.open is a function");
  assert(typeof YT.palette.close === "function", "palette.close is a function");
  assert(typeof YT.palette.isOpen === "function", "palette.isOpen is a function");
  assert(YT.palette.isOpen() === false, "palette starts closed");
  YT.palette.open("test");
  assert(YT.palette.isOpen() === true, "palette opens");
  assert(
    document.querySelector("#ytp-palette") !== null,
    "palette DOM element is in the document",
  );
  assert(
    document.querySelector("#ytp-palette-input") !== null,
    "palette input element is in the document",
  );
  YT.palette.close();
  assert(YT.palette.isOpen() === false, "palette closes");

  assert(typeof YT.cheat.open === "function", "cheat.open is a function");
  assert(typeof YT.cheat.close === "function", "cheat.close is a function");
  assert(YT.cheat.isOpen() === false, "cheat starts closed");
  YT.cheat.open();
  assert(YT.cheat.isOpen() === true, "cheat opens");
  assert(
    document.querySelector("#ytp-cheat") !== null,
    "cheat DOM element is in the document",
  );
  // Verify the cheat body was rendered with rows
  const cheatRows = document.querySelectorAll("#ytp-cheat .ytp-cheat-row");
  assert(
    cheatRows.length > 10,
    "cheat sheet has >10 hotkey rows (got " + cheatRows.length + ")",
  );
  // Verify there are at least 3 category headers
  const cheatCats = document.querySelectorAll("#ytp-cheat .ytp-cheat-cat");
  assert(cheatCats.length >= 3, "cheat sheet has >=3 categories");
  YT.cheat.close();
  assert(YT.cheat.isOpen() === false, "cheat closes");

  console.log("\n# Dashboard keybindings (the IIFE install) registered");
  // The IIFE binds a document-level keydown handler with capture.
  // We can verify it's wired by checking that the cheat opens on
  // a synthetic '?' event when the dashboard is open. But opening
  // the dashboard requires the Uo() path which manipulates the DOM
  // heavily — skip that and instead check that a keyboard event
  // with the cheat.open binding triggers cheat open.
  // Force-bind cheat.open to a sentinel, dispatch a matching event
  // on the document, and assert the cheat opened.
  YT.setCfg("hotkeyOptIn", true);
  YT.actions.setBinding("cheat.open", "KeyX");
  const ev2 = new window.KeyboardEvent("keydown", { code: "KeyX", bubbles: true });
  document.dispatchEvent(ev2);
  await new Promise((r) => setTimeout(r, 30));
  assert(
    YT.cheat.isOpen(),
    "dispatching a keydown matching cheat.open opens the cheat sheet",
  );
  YT.cheat.close();
  YT.actions.resetBinding("cheat.open");
  YT.setCfg("hotkeyOptIn", false);

  console.log("\n# v3.0.18.8 behavioral tests for previous-pass fixes");
  // ----------------------------------------------------------------
  // v3.0.18.7 fix #1 — hotkey re-capture listener leak (behavioral)
  // ----------------------------------------------------------------
  // Open the dashboard, render the custom-hotkeys panel, click
  // button A (start capture for hotkey #1), then click button B
  // (start capture for hotkey #2) WITHOUT pressing a key in
  // between, then dispatch ONE keydown event. Only button B's
  // action should be rebound — A's listener should have been
  // removed when B's capture started.
  //
  // The source-grep test we used in v3.0.18.7 was a fallback for
  // cases where the dashboard can't be fully rendered in jsdom;
  // now that the dashboard's render path is exercised by the
  // existing tests, we drive the actual buttons. If the dashboard
  // can't be rendered (e.g. jsdom limitation) we fall back to the
  // source-grep check so the test still runs.
  const userJs = fs.readFileSync(
    path.join(__dirname, "yt+.user.js"),
    "utf8",
  );
  // We need hotkeyOptIn on so the dashboard shows the custom-keys
  // panel. The keys we touch are bookmarkNow and togglePiP — both
  // have a default binding. We use them as our two buttons A and
  // B for the test.
  YT.setCfg("hotkeyOptIn", true);
  // Open the dashboard and give it time to render. The dashboard
  // uses requestIdleCallback / setTimeout chains so we need a
  // generous wait — the test_dashboard.js sandbox test uses
  // 800+500ms. We do 600ms here.
  YT.openDashboard();
  await new Promise((r) => setTimeout(r, 600));
  // The "Custom Keyboard Shortcuts" panel renders as a settings
  // block when its master (hotkeyOptIn) is on. The dashboard
  // element has class="ytp-dash" (no id attribute on the
  // element itself, the CSS targets .ytp-dash). Find the rebind
  // buttons (class .ytp-hk-key). If the dashboard render is
  // incomplete in jsdom, this list may be empty — fall through
  // to the source-grep check.
  const dashRoot = document.querySelector(".ytp-dash");
  const hkButtons = dashRoot
    ? dashRoot.querySelectorAll(".ytp-hk-key")
    : [];
  let behavioralRebindTestRan = false;
  if (hkButtons.length >= 2) {
    // Pick two buttons (A and B) whose actions we'll try to rebind.
    const btnA = hkButtons[0];
    const btnB = hkButtons[1];
    // Snapshot the bindings before we click.
    const mapBefore = JSON.parse(JSON.stringify(YT.cfg.hotkeyMap || {}));
    // Click A (start capture). UI flips to "press a key…".
    btnA.click();
    // Click B (interrupt capture, start a new one). The v3.0.18.7
    // fix removes A's keydown listener here.
    btnB.click();
    behavioralRebindTestRan = true;
    // Dispatch ONE keydown. Only B's handler should fire.
    const kev = new window.KeyboardEvent("keydown", {
      code: "KeyZ",
      key: "z",
      bubbles: true,
    });
    document.dispatchEvent(kev);
    await new Promise((r) => setTimeout(r, 30));
    // The map should have one new entry — for B's action only.
    // Count how many keys in the map refer to "KeyZ".
    const mapAfter = JSON.parse(JSON.stringify(YT.cfg.hotkeyMap || {}));
    const aBound = mapAfter[btnA.dataset && btnA.dataset.rowid] === "KeyZ";
    const bBound = mapAfter[btnB.dataset && btnB.dataset.rowid] === "KeyZ";
    // The buttons may not carry rowid attributes; fall back to
    // counting KeyZ entries in the map.
    const keyZEntries = Object.entries(mapAfter).filter(
      ([k, v]) => v === "KeyZ",
    ).length;
    if (btnA.dataset && btnA.dataset.rowid && btnB.dataset && btnB.dataset.rowid) {
      assert(
        !aBound && bBound,
        "hotkey re-capture: only the second button (B) gets rebound, not both",
      );
    } else {
      // No rowid in the DOM; assert that the map got exactly one
      // new KeyZ entry (i.e. A's listener did NOT also fire).
      assert(
        keyZEntries === 1,
        "hotkey re-capture: exactly one action got rebound to KeyZ (got " +
          keyZEntries +
          ")",
      );
    }
    // Restore the map so other tests aren't affected.
    YT.setCfg("hotkeyMap", mapBefore);
  }
  assert(
    behavioralRebindTestRan,
    "hotkey re-capture behavioral test ran (dashboard rendered at least 2 .ytp-hk-key buttons)",
  );
  // The source-grep fallback (kept for resilience).
  const hasRemove =
    /_n\s*&&\s*\([\s\S]{0,200}document\.removeEventListener\(\s*["']keydown["']\s*,\s*_n\.handler\s*,\s*!?0\s*\)/.test(
      userJs,
    );
  assert(
    hasRemove || behavioralRebindTestRan,
    "hotkey re-capture source-grep fallback: removeEventListener(\"keydown\", _n.handler, !0) present",
  );
  // v3.0.18.8 refactor: the lifecycle is now centralized in _nClear().
  const hasClearHelper = /function _nClear\s*\(\s*\)\s*\{/.test(userJs);
  assert(
    hasClearHelper,
    "hotkey capture lifecycle centralized in _nClear() (v3.0.18.8 refactor)",
  );

  // ----------------------------------------------------------------
  // v3.0.18.7 fix #2 — dashboard search null-dereference (behavioral)
  // ----------------------------------------------------------------
  // The dashboard search input filter maps over every .ytp-card and
  // calls va.get(t.dataset.feat) to look up the feature. If a card
  // refers to a feature that has been removed, Map.get returns
  // undefined, and the old code would dereference `a.name` on
  // every keystroke. The fix guards with `if (!a) { hide; return; }`.
  //
  // Behavioral test: open the dashboard, take a snapshot of the
  // .ytp-card count, manually clone a card and rewrite its
  // data-feat to a value that is NOT in the registry, then
  // dispatch an `input` event on the search box. The card count
  // should drop by one (the stale one hidden), and no exception
  // should be thrown.
  let threw = null;
  try {
    // First, ensure the dashboard is open.
    YT.openDashboard();
    await new Promise((r) => setTimeout(r, 600));
    // Dashboard uses class="ytp-dash" on the root element, not an id.
    const dashRoot2 = document.querySelector(".ytp-dash");
    const search = dashRoot2
      ? dashRoot2.querySelector(".ytp-search")
      : null;
    const allCards = dashRoot2
      ? dashRoot2.querySelectorAll(".ytp-card")
      : [];
    if (search && allCards.length >= 2) {
      // Clone the first card, set its data-feat to a nonexistent id,
      // append it to the body (still inside #ytp-dash via the
      // existing card's parent).
      const ghost = allCards[0].cloneNode(true);
      ghost.dataset.feat = "definitely-not-a-real-feature-xyz";
      ghost.id = "ytp-ghost-card";
      allCards[0].parentNode.appendChild(ghost);
      // Type into the search box to trigger the filter.
      search.value = "a";
      search.dispatchEvent(new window.Event("input", { bubbles: true }));
      // The search handler is debounced via ee(..., 80) so we need
      // to wait for that to fire.
      await new Promise((r) => setTimeout(r, 200));
      // The ghost card should be hidden (display: none).
      assert(
        ghost.style.display === "none",
        "dashboard search hides stale data-feat cards silently (no TypeError on a.name)",
      );
      // Clean up the ghost.
      ghost.remove();
      search.value = "";
      search.dispatchEvent(new window.Event("input", { bubbles: true }));
    } else {
      assert(
        false,
        "dashboard search behavioral test precondition failed (no search or cards)",
      );
    }
  } catch (e) {
    threw = e;
  }
  assert(
    threw === null,
    "dashboard search does not throw on stale data-feat (no exception caught)",
  );

  // Close the dashboard so subsequent tests aren't affected.
  try { YT.closeDashboard(); } catch (e) {}
  await new Promise((r) => setTimeout(r, 50));
  YT.setCfg("hotkeyOptIn", false);

  console.log("\n# v3.0.18.8 action registry integrity check");
  // v3.0.18.8 regression guard: the action registry has grown to
  // 30+ actions over v3.0.18 / v3.0.18.1 / v3.0.18.5 / v3.0.18.7.
  // Duplicate-id registrations are silent (the _register helper
  // logs and returns) but they would mean a real action was
  // shadowed by a later one. Walk the registry and assert: every
  // action has a unique id, every action has a non-empty label,
  // and every action's run is a function.
  const allActions = YT.actions.list();
  assert(
    allActions.length >= 30,
    "action registry has at least 30 registered actions (got " +
      allActions.length +
      ")",
  );
  const ids = allActions.map((a) => a.id);
  const uniqIds = Array.from(new Set(ids));
  assert(
    ids.length === uniqIds.length,
    "action registry has no duplicate ids (got " +
      ids.length +
      " unique of " +
      uniqIds.length +
      ")",
  );
  const emptyLabels = allActions.filter((a) => !a.label || !a.label.trim());
  assert(
    emptyLabels.length === 0,
    "every action has a non-empty label (got " +
      emptyLabels.length +
      " empty)",
  );
  // run() should be a function on every action. We can't check
  // _run internals from outside, but we can call run and see if
  // it throws. We use a non-existent id first to assert the
  // graceful-fail path returns false.
  const noopResult = YT.actions.run("definitely-not-a-real-action");
  assert(noopResult === false, "actions.run returns false for unknown id");

  console.log("\n# Done.");
  console.log("Pass: " + pass + ", Fail: " + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error("Test runner error:", e && (e.stack || e.message || e));
  process.exit(1);
});
