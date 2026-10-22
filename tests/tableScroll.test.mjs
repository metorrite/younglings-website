// Run with: node --test tests/*.test.mjs
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";

// Every <table> sits in a box that scrolls sideways, so a wide table doesn't squash or push the page wider on a phone (T-186).
// The wrapper must be one of the few elements just above the table.
const ROOT = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const LOOK_BACK_LINES = 4;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx$/.test(name) ? [path] : [];
  });
}

export function unwrappedTables(source) {
  const lines = source.split("\n");
  const found = [];
  lines.forEach((line, i) => {
    if (!/<table[\s>]/.test(line)) return;
    const above = lines.slice(Math.max(0, i - LOOK_BACK_LINES), i + 1).join("\n");
    if (!/overflow-(x-)?auto/.test(above)) found.push(i + 1);
  });
  return found;
}

test("the check finds a table with no scroll wrapper, and accepts one with it", () => {
  assert.deepEqual(unwrappedTables(`<div>\n  <table className="w-full">\n</table></div>`), [2]);
  assert.deepEqual(unwrappedTables(`<div className="overflow-x-auto">\n  <table className="w-full">\n</table></div>`), []);
});

test("every table on the site scrolls sideways on a narrow screen", () => {
  const problems = [];
  for (const file of files(ROOT)) {
    for (const line of unwrappedTables(readFileSync(file, "utf8"))) problems.push(`${relative(ROOT, file)}:${line}`);
  }
  assert.deepEqual(problems, [], "wrap these in <div className=\"overflow-x-auto\">");
});
