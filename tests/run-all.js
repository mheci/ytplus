// run-all.js — executes every test_* suite in order and summarises.
"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const suites = fs
  .readdirSync(dir)
  .filter((f) => /^test_.*\.js$/.test(f))
  .sort();

let fail = 0;
for (const s of suites) {
  const p = path.join(dir, s);
  process.stdout.write("== " + s + " ");
  try {
    execFileSync(process.execPath, [p], {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: path.join(dir, ".."),
    });
    console.log("OK");
  } catch (e) {
    fail++;
    console.log("FAIL");
    process.stdout.write(String(e.stdout || ""));
    process.stderr.write(String(e.stderr || ""));
  }
}
console.log(
  "\n" +
    suites.length +
    " suites, " +
    (suites.length - fail) +
    " passed, " +
    fail +
    " failed",
);
process.exit(fail ? 1 : 0);
