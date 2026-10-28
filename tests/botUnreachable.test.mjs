// Run with: node --test tests/*.test.mjs   (Node 22.18+/24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { test } from "node:test";
import { AdminUnavailableError, BOT_UNREACHABLE_DIGEST, errorText, isBotUnreachable } from "../src/lib/botUnreachable.ts";

test("the bot-unreachable error carries the fixed digest, which survives to the error page", () => {
  const err = new AdminUnavailableError();
  assert.equal(err.digest, BOT_UNREACHABLE_DIGEST);
  assert.ok(err instanceof Error);
  assert.equal(isBotUnreachable(err), true);
  // what a client error boundary gets in production: message stripped, digest kept
  assert.equal(isBotUnreachable({ digest: err.digest }), true);
});

test("an unreachable bot gets the 'Can't reach JonnyBot' text and no reference", () => {
  const text = errorText({ digest: BOT_UNREACHABLE_DIGEST }, "Try again in a moment.");
  assert.equal(text.title, "Can't reach JonnyBot");
  assert.match(text.body, /Try again in a moment\.$/);
  assert.equal(text.reference, null);
});

test("any other error is 'Something broke' with its digest as the reference", () => {
  const text = errorText({ digest: "2849301776" }, "unused");
  assert.equal(text.title, "Something broke");
  assert.doesNotMatch(text.body, /JonnyBot/);
  assert.equal(text.reference, "2849301776");
  assert.equal(isBotUnreachable(new Error("TypeError: x is undefined")), false);
});

test("an error without a digest (dev, or thrown in the browser) is generic with no reference", () => {
  const text = errorText({}, "unused");
  assert.equal(text.title, "Something broke");
  assert.equal(text.reference, null);
  assert.equal(isBotUnreachable(undefined), false);
});
