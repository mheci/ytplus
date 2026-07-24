// test_scope_guard.js — regression guard for the v3.0.20.0 scope-collision fixes.
//
// Background: the IIFE top-level scope carried FOUR pairs of function
// declarations with identical names (Da, Va, qa, Fo). With hoisting, the LAST
// declaration wins for the entire scope, so:
//   - the channel blocker matched cards against the *font family list* and
//     its "Block" button wrote ~30 font names into channelBlockerList
//     (data corruption),
//   - the force-CC apply path was a dead no-op (Va → anchor-info extractor),
//   - the captions settings card crashed on render (Fo → clamp-rect returns
//     a plain object; appendChild(object) throws TypeError),
//   - the CC "verify stuck on" interval read "" instead of {enabled,...}.
//
// These suites pass with zero browser deps — pure source analysis —
// because every failure mode above is visible statically.
"use strict";
const fs = require("fs");
const path = require("path");
const code = fs.readFileSync(
  path.join(__dirname, "..", "yt+.user.js"),
  "utf8",
);
const lines = code.split(/\r?\n/);

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

// ---------------------------------------------------------------- scanner
// Reproduces the exact failure class: two same-scope function declarations
// sharing one name at the outer-IIFE top level (2-space indent).
function topLevelFunctionDecls(src) {
  const out = [];
  src.split(/\r?\n/).forEach((l, i) => {
    const m = /^  function ([A-Za-z0-9_$]+)\s*\(/.exec(l);
    if (m) out.push([m[1], i + 1]);
  });
  return out;
}
function topLevelSimpleConstDecls(src) {
  const out = [];
  src.split(/\r?\n/).forEach((l, i) => {
    const m = /^  (const|let) ([A-Za-z0-9_$]+)\s*=/.exec(l);
    if (m) out.push([m[2], i + 1]);
  });
  return out;
}

const fns = topLevelFunctionDecls(code);
const fnSeen = new Map();
const dupFns = [];
for (const [name, ln] of fns) {
  if (fnSeen.has(name)) dupFns.push(`${name} (lines ${fnSeen.get(name)} & ${ln})`);
  else fnSeen.set(name, ln);
}
ok(
  "no duplicate top-level function declarations in the IIFE scope",
  dupFns.length === 0,
);
if (dupFns.length) dupFns.forEach((d) => console.error("       dup: " + d));

const consts = topLevelSimpleConstDecls(code);
const cSeen = new Map();
const dupConsts = [];
for (const [name, ln] of consts) {
  if (cSeen.has(name)) dupConsts.push(`${name} (lines ${cSeen.get(name)} & ${ln})`);
  else cSeen.set(name, ln);
}
ok(
  "no duplicate single-line top-level const/let declarations",
  dupConsts.length === 0,
);
if (dupConsts.length) dupConsts.forEach((d) => console.error("       dup: " + d));

// a function name must never collide with a top-level const (mixed crash)
const fnNames = new Set(fns.map(([n]) => n));
const mixed = consts.filter(([n]) => fnNames.has(n));
ok("no function/const name collisions at the top level", mixed.length === 0);

// ------------------------------------------------- renamed helpers exist
const renames = {
  Cc_state: "function Cc_state() {", // force-CC state reader
  Cc_apply: "function Cc_apply() {", // force-CC apply
  Cb_norm: "function Cb_norm(e) {", // channel handle/url normalizer
  Cb_parseList: "function Cb_parseList() {", // channel list builder
  Cb_anchorInfo: "function Cb_anchorInfo(e) {", // anchor -> {handle,name,href}
  Yp_fontRow: "function Yp_fontRow(e, t) {", // dashboard font preview row
  Yt_fontFamilies: "function Yt_fontFamilies() {", // font family list
  Yp_clampRect: "function Yp_clampRect(e, t, a, n) {", // dashboard drag clamp
};
for (const [name, sig] of Object.entries(renames))
  ok(`${name} is declared exactly once at top level`,
     code.split(sig).length - 1 === 1);

// --------------------------------------------------- call-site wiring
// CRLF-safe: allow \r?\n after {
ok("CC state reader used by Cc_apply body",
   /function Cc_apply\(\)\s*\{\r?\n[\s\S]{0,200}?Cc_state\(\)/.test(code));
ok("CC verify interval uses Cc_state()",
   /Ma\.lastVerifyFix[\s\S]{0,600}?Cc_state\(\)|Cc_state\(\)[\s\S]{0,600}?Ma\.lastVerifyFix/.test(code));
ok("cfg.changed handler calls Cc_apply()",
   /key\.startsWith\("cc"\)[\s\S]{0,800}?Cc_apply\(\)/.test(code));
ok("Block button normalizer wired to Cb_norm + Cb_parseList",
   /"Block " \+ a[\s\S]{0,200}?Cb_parseList\(\)/.test(code));
ok("handle/name splitter iterates Cb_parseList()",
   /for \(const a of Cb_parseList\(\)\)/.test(code));
ok("font dropdown iterates Yt_fontFamilies()",
   /Yt_fontFamilies\(\)\.forEach/.test(code));
ok("captions settings appends Yp_fontRow(...)",
   /Yp_fontRow\("Font family \(with preview\)", "ccFontFamily"\)/.test(code));
ok("dashboard clamp uses Yp_clampRect(",
   /zo\(Yp_clampRect\(e\.left, e\.top, e\.width, e\.height\)\)/.test(code));

// old colliding declarations are fully gone
for (const n of ["qa", "Da", "Va", "Fo"]) {
  const re = new RegExp(`^  function ${n}\\(`, "m");
  ok(`no top-level "function ${n}(" remains`, !re.test(code));
}

// -------------------------------------------- rebuffer toast cap (r = r)
ok("rebuffer toast suppression counter increments (no self-assign)",
   !/\(r = r\)\)/.test(code) && /\(r \+= 1\)\)/.test(code));

console.log(`\n${passed} passed, ${failed} failed`);
