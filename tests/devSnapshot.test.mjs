// Run with: node --test tests/   (Node 22.18+/24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { clearOwnerCache, decideOwner } from "../src/lib/devSnapshotGate.ts";
import { cleanClientState, mergeSnapshot, scrub } from "../src/lib/siteSnapshot.ts";

beforeEach(() => clearOwnerCache());

const answer = (data) => async () => ({ ok: true, data });

test("only an allowed bot owner is an owner", async () => {
  assert.equal((await decideOwner("123", answer({ allowed: true, tier: "ADMIN", isOwner: true }))).owner, true);
});

test("everyone else gets no button", async () => {
  const cases = {
    "a normal admin": answer({ allowed: true, tier: "ADMIN", isOwner: false }),
    "an older bot that sends no isOwner": answer({ allowed: true, tier: "ADMIN" }),
    "someone not allowed in": answer({ allowed: false, tier: "NONE", isOwner: true }),
    "a bot that answers not ok": async () => ({ ok: false }),
    "a bot that is down": async () => {
      throw new Error("ECONNREFUSED");
    },
  };
  for (const [name, lookup] of Object.entries(cases)) assert.equal((await decideOwner("123", lookup)).owner, false, name);
});

test("signed-out or malformed ids never reach the bot", async () => {
  let calls = 0;
  const lookup = async () => {
    calls++;
    return { ok: true, data: { allowed: true, tier: "ADMIN", isOwner: true } };
  };
  for (const id of [undefined, null, "", "abc", "12 3", "1".repeat(30)]) assert.equal((await decideOwner(id, lookup)).owner, false);
  assert.equal(calls, 0);
});

test("a down bot is not remembered", async () => {
  await decideOwner("5", async () => {
    throw new Error("down");
  });
  assert.equal((await decideOwner("5", answer({ allowed: true, tier: "ADMIN", isOwner: true }))).owner, true);
});

test("an answer is cached for a minute", async () => {
  let calls = 0;
  const lookup = async () => {
    calls++;
    return { ok: true, data: { allowed: true, tier: "ADMIN", isOwner: false } };
  };
  await decideOwner("7", lookup, 1000);
  await decideOwner("7", lookup, 30_000);
  assert.equal(calls, 1);
  await decideOwner("7", lookup, 70_000);
  assert.equal(calls, 2);
});

test("scrub masks credentials in text", () => {
  // built at run time so no secret-shaped literal sits in the source
  const jwt = ["ey" + "Jhb".repeat(3), "ey" + "Jzd".repeat(3), "abc".repeat(5)].join(".");
  const text = scrub(`fetch failed Authorization: Bearer ${"abc".repeat(6)} token=${"hunter2".repeat(2)} {"password":"x1y2z3"} ${jwt}`);
  for (const secret of ["abc".repeat(6), "hunter2".repeat(2), "x1y2z3", jwt]) assert.ok(!text.includes(secret), `${secret} survived: ${text}`);
});

test("client state is bounded, scrubbed and drops secrets", () => {
  const ring = Array.from({ length: 80 }, (_, i) => ({ at: "t", kind: "console", message: `error ${i} access_token=zzzzzzzzzz` }));
  const state = cleanClientState({
    url: "https://x.test/dashboard/123/events?code=SECRETCODE#frag",
    path: "/dashboard/123/events?code=SECRETCODE",
    guildId: "123",
    focus: "Event:12",
    ring,
    storage: { "jonnybot-dashboard-view": "advanced", "next-auth.session-token": "abc", apiKey: "k", favourites: '["a"]' },
    cookies: "session=1",
  });
  assert.equal(state.url, "https://x.test/dashboard/123/events");
  assert.equal(state.path, "/dashboard/123/events");
  assert.equal(state.focus, "event:12");
  assert.equal(state.ring.length, 50);
  assert.ok(!JSON.stringify(state).includes("zzzzzzzzzz"));
  assert.deepEqual(Object.keys(state.storage).sort(), ["favourites", "jonnybot-dashboard-view"]);
  assert.ok(!("cookies" in state));
  assert.equal(cleanClientState({ guildId: "../x", focus: "drop table" }).guildId, null);
  assert.equal(cleanClientState({ focus: "drop table" }).focus, "");
});

test("merge keeps the bot's files and adds the site's", () => {
  const bot = zipSync({ "manifest.json": strToU8(JSON.stringify({ id: "snap-20261019-030000-abcd" })), "guild.json": strToU8("{}"), "db/event.json": strToU8("[]") });
  const client = cleanClientState({ url: "https://x.test/p", path: "/p", ring: [{ at: "t", kind: "fetch", message: "POST /p -> 500" }], storage: { view: "basic" } });
  const merged = unzipSync(mergeSnapshot(bot, "snap-20261019-030000-abcd", client, { face: "clan", role: "bot owner (admin)", siteCommit: "abc", nodeEnv: "test", serverTimeUtc: "2026-10-19T03:00:00Z" }));
  assert.deepEqual(Object.keys(merged).sort(), ["db/event.json", "guild.json", "manifest.json", "site/client-log.json", "site/page.json", "site/storage.json"]);
  assert.equal(JSON.parse(strFromU8(merged["manifest.json"])).id, "snap-20261019-030000-abcd");
  assert.equal(JSON.parse(strFromU8(merged["site/page.json"])).face, "clan");
  assert.equal(JSON.parse(strFromU8(merged["site/client-log.json"])).entries[0].message, "POST /p -> 500");
});
