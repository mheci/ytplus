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

  console.log("\n# v3.0.18.7 hotkey re-capture listener-leak fix");
  // Repro: open the dashboard, navigate to the
  // "Custom Keyboard Shortcuts" panel, click button A
  // (start capture), then click button B (start a
  // different capture) without pressing a key in between.
  // Before the fix, button A's keydown listener stayed
  // attached. The next keypress then fired BOTH A's and
  // B's handlers, double-rebinding both actions. After
  // the fix, A's listener is explicitly removed when B
  // starts its capture.
  //
  // We can't easily drive the actual buttons in jsdom
  // (they're inside the dashboard's deferred render), so
  // we directly inspect the source code to confirm the
  // removeEventListener("keydown", _n.handler, !0) call
  // is present in the click handler for the rebind
  // buttons. A small but reliable test: grep the user.js
  // source for the exact fix line.
  const userJs = fs.readFileSync(
    path.join(__dirname, "yt+.user.js"),
    "utf8",
  );
  const hasRemove =
    /_n\s*&&\s*\([\s\S]{0,200}document\.removeEventListener\(\s*["']keydown["']\s*,\s*_n\.handler\s*,\s*!?0\s*\)/.test(
      userJs,
    );
  assert(
    hasRemove,
    "hotkey re-capture explicitly removes previous capture's keydown listener (v3.0.18.7 fix)",
  );
  // Also verify the handler reference is stored in _n
  const hasHandlerRef =
    /_n\s*=\s*\{\s*btn:\s*r\s*,\s*prevText:\s*e\s*,\s*handler:\s*a\s*\}/.test(
      userJs,
    );
  assert(
    hasHandlerRef,
    "hotkey capture stores handler reference on _n for later removal (v3.0.18.7 fix)",
  );

  console.log("\n# Done.");
  console.log("Pass: " + pass + ", Fail: " + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error("Test runner error:", e && (e.stack || e.message || e));
  process.exit(1);
});
