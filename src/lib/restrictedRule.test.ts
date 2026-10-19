import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-expect-error node runs this file directly and needs the .ts extension
import { areaAllowed } from "./restrictedRule.ts";

const base = { allowed: false, tier: "NONE" };

test("a listed area lets the person in, an unlisted one does not", () => {
  const who = { ...base, areas: { hub: true, jonnybot: false } };
  assert.equal(areaAllowed(who, "hub"), true);
  assert.equal(areaAllowed(who, "jonnybot"), false);
  assert.equal(areaAllowed(who, "dashboard"), false);
});

test("when the bot sends areas, the old beta flag no longer decides", () => {
  assert.equal(areaAllowed({ ...base, beta: true, areas: { hub: false } }, "hub"), false);
});

test("an older bot without areas falls back to beta, then to the clan admins", () => {
  assert.equal(areaAllowed({ ...base, beta: true }, "hub"), true);
  assert.equal(areaAllowed({ allowed: true, tier: "ADMIN" }, "dashboard"), true);
  assert.equal(areaAllowed({ allowed: true, tier: "NONE" }, "dashboard"), false);
  assert.equal(areaAllowed(base, "dashboard"), false);
});

test("anything but an explicit true is a no", () => {
  assert.equal(areaAllowed({ ...base, areas: { hub: "yes" as unknown as boolean } }, "hub"), false);
});
