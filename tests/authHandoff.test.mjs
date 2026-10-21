// Run with: node --test tests/*.test.mjs   (Node 22.18+/24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedRedirect, authHost, cookieDomainFor, cookieDomains, multiDomain, needsHandoff, safePath } from "../src/lib/authDomains.ts";
import { HANDOFF_TTL_MS, HandoffStore } from "../src/lib/authHandoff.ts";

const TWO = cookieDomains({ AUTH_COOKIE_DOMAINS: ".rsyounglings.com, rsclans.example ,.rsyounglings.com" });

test("one cookie domain (today) or none: no handoff anywhere", () => {
  const one = cookieDomains({ AUTH_COOKIE_DOMAIN: ".rsyounglings.com" });
  assert.deepEqual(one, [".rsyounglings.com"]);
  assert.equal(multiDomain(one), false);
  assert.equal(needsHandoff("https://jonnybot.rsyounglings.com/x", "rsyounglings.com", one), false);
  assert.deepEqual(cookieDomains({}), []);
  assert.equal(cookieDomainFor("localhost:3000", one), undefined);
});

test("two cookie domains: each host belongs to its own apex", () => {
  assert.deepEqual(TWO, [".rsyounglings.com", ".rsclans.example"]);
  assert.equal(multiDomain(TWO), true);
  assert.equal(cookieDomainFor("jonnybot.rsyounglings.com", TWO), ".rsyounglings.com");
  assert.equal(cookieDomainFor("rsclans.example:443", TWO), ".rsclans.example");
  assert.equal(cookieDomainFor("evilrsclans.example", TWO), undefined, "a look-alike apex is not ours");
  assert.equal(needsHandoff("https://rsclans.example/hub", "rsyounglings.com", TWO), true);
  assert.equal(needsHandoff("https://www.rsyounglings.com/", "rsyounglings.com", TWO), false);
  assert.equal(needsHandoff("https://stranger.example/", "rsyounglings.com", TWO), false);
});

test("redirects after sign-in only go to our hosts over https", () => {
  assert.equal(allowedRedirect("https://rsclans.example/c/abc", TWO), true);
  assert.equal(allowedRedirect("https://events.rsclans.example/", TWO), true);
  assert.equal(allowedRedirect("http://rsclans.example/", TWO), false);
  assert.equal(allowedRedirect("https://rsclans.example.evil.test/", TWO), false);
  assert.equal(allowedRedirect("https://user:pw@rsclans.example/", TWO), false);
  assert.equal(allowedRedirect("javascript:alert(1)", TWO), false);
  assert.equal(allowedRedirect("https://mapped.test/", TWO, (h) => h === "mapped.test"), true);
  assert.equal(authHost({ NEXTAUTH_URL: "https://rsyounglings.com" }), "rsyounglings.com");
  assert.equal(authHost({}), null);
});

test("the handoff only returns to a path on its own host", () => {
  assert.equal(safePath("/hub/c/abc?x=1"), "/hub/c/abc?x=1");
  assert.equal(safePath("//evil.test/"), "/");
  assert.equal(safePath("/\\evil.test"), "/");
  assert.equal(safePath("https://evil.test/"), "/");
  assert.equal(safePath(null), "/");
});

test("a code works once, on its host, within a minute", () => {
  let now = 1_000_000;
  const store = new HandoffStore(() => now);
  const who = { sub: "1", discordId: "123", name: "Drake" };

  const code = store.issue(who, "RSClans.example");
  assert.ok(code.length >= 40, "32 random bytes");
  assert.deepEqual(store.redeem(code, "rsclans.example"), who);
  assert.equal(store.redeem(code, "rsclans.example"), null, "replay refused");

  const wrongHost = store.issue(who, "rsclans.example");
  assert.equal(store.redeem(wrongHost, "rsyounglings.com"), null, "wrong host refused");
  assert.equal(store.redeem(wrongHost, "rsclans.example"), null, "and the code is burnt");

  const late = store.issue(who, "rsclans.example");
  now += HANDOFF_TTL_MS;
  assert.equal(store.redeem(late, "rsclans.example"), null, "expired");

  assert.equal(store.redeem("nope", "rsclans.example"), null);
  assert.notEqual(store.issue(who, "a.test"), store.issue(who, "a.test"), "codes are random");
});
