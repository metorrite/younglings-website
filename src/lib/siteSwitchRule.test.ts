import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-expect-error node runs this file directly and needs the .ts extension
import { resolveSwitch } from "./siteSwitchRule.ts";

test("the environment kill switch closes the gate whatever the live switch says", () => {
  assert.deepEqual(resolveSwitch("false", true), { open: false, source: "env-closed" });
  assert.deepEqual(resolveSwitch(" FALSE ", true), { open: false, source: "env-closed" });
});

test("an environment variable set to true keeps the gate open as it always did", () => {
  assert.deepEqual(resolveSwitch("true", false), { open: true, source: "env-open" });
});

test("with no environment variable the live switch decides", () => {
  assert.deepEqual(resolveSwitch(undefined, true), { open: true, source: "live" });
  assert.deepEqual(resolveSwitch("", false), { open: false, source: "live" });
});

test("a live switch that is missing or unreadable keeps the gate closed", () => {
  assert.equal(resolveSwitch(undefined, undefined).open, false);
  assert.equal(resolveSwitch("maybe", undefined).open, false);
});
