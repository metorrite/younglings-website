import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-expect-error node runs this file directly and needs the .ts extension
import { ownerAllowed } from "./ownerGate.ts";

test("only an explicit true from the bot makes someone the owner", () => {
  assert.equal(ownerAllowed(true), true);
});

test("a normal admin, a missing answer and odd values are all refused", () => {
  for (const value of [false, undefined, null, "true", 1, {}, []]) assert.equal(ownerAllowed(value), false);
});
