// test_meta.js — header/packaging consistency checks. These are the
// checks that keep the update checker truthful and the repo artifacts
// (user.js, meta.js, package.json, README badge) in lockstep.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const user = fs.readFileSync(path.join(root, "yt+.user.js"), "utf8");
const metaExists = fs.existsSync(path.join(root, "yt+.meta.js"));
const meta = metaExists
  ? fs.readFileSync(path.join(root, "yt+.meta.js"), "utf8")
  : "";
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
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

const verMatch = user.match(/^\/\/ @version\s+(\S+)/m);
ok("@version present in user.js", !!verMatch);
const ver = verMatch ? verMatch[1] : null;

ok("meta.js exists at repo root (required by @updateURL)", metaExists);
ok(
  "meta.js version matches user.js version",
  meta.includes("// @version      " + ver) ||
    new RegExp("// @version\\s+" + ver.replace(/\./g, "\\.")).test(meta),
);
ok("package.json version matches", pkg.version === ver);

ok(
  "@updateURL points at releases/latest/download/yt+.meta.js",
  /@updateURL\s+https:\/\/github\.com\/mheci\/ytplus\/releases\/latest\/download\/yt%2B\.meta\.js/.test(user),
);
ok(
  "@downloadURL points at releases/latest/download/yt+.user.js",
  /@downloadURL\s+https:\/\/github\.com\/mheci\/ytplus\/releases\/latest\/download\/yt%2B\.user\.js/.test(user),
);
ok("meta.js carries the same @updateURL", /@updateURL/.test(meta));

// @icon must point at a file that actually exists in the repo
const iconMatch = user.match(/^\/\/ @icon\s+(\S+)/m);
ok("@icon header present", !!iconMatch);
if (iconMatch) {
  const raw = "https://raw.githubusercontent.com/mheci/ytplus/main/";
  if (iconMatch[1].startsWith(raw)) {
    const rel = iconMatch[1].slice(raw.length);
    ok(
      "@icon target exists in repo (" + rel + ")",
      fs.existsSync(path.join(root, rel)),
    );
  } else {
    ok("@icon is not repo-relative (skipped existence check)", true);
  }
}

// description budget: every byte of @description is fetched on EVERY
// background update check (it lives in meta.js). Keep it compact.
const descMatch = user.match(/^\/\/ @description\s+(.+)/m);
ok("@description present", !!descMatch);
ok(
  "@description under 900 chars (update-check fetch budget)",
  !!descMatch && descMatch[1].length <= 900,
);

// required headers
for (const h of [
  "// @name         YT+",
  "// @namespace    https://github.com/mheci/ytplus",
  "// @run-at       document-start",
  "// @noframes",
  "// @match        https://www.youtube.com/*",
  "// @match        https://music.youtube.com/*",
  "// @match        https://m.youtube.com/*",
  "// @grant        GM_xmlhttpRequest",
  "// @grant        unsafeWindow",
  "// @connect      sponsor.ajay.app",
  "// @connect      api.github.com",
]) {
  ok("header present: " + h.trim(), user.includes(h + "\n") || user.includes(h + "\r\n") || user.includes(h));
}

// meta.js is a strict prefix of user.js (it is the header verbatim)
ok(
  "meta.js is a verbatim copy of the user.js header",
  meta.length > 0 && user.startsWith(meta.trimEnd()) && meta.trim().endsWith("// ==/UserScript=="),
);

console.log(`\n${passed} passed, ${failed} failed`);
