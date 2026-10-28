// Run with: node --test tests/   (Node 22.18+/24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  apiOriginFor, apexHost, classifyHost, clanHostOf, clanHref, eventsHref, hubHref, isReservedSlug, jonnybotHostOf, linkHref, resolveHost,
  siteInfoFor, subdomainMode, tenantSlugOf,
} from "../src/lib/siteHosts.ts";

const VARS = ["SITE_HOSTS", "SITE_HOST_ALIASES", "SITE_TENANT_SUFFIX", "SITE_APEX_HOST", "AUTH_COOKIE_DOMAIN", "PUBLIC_API_ORIGIN", "JONNYBOT_SUBDOMAIN"];
let saved;
beforeEach(() => {
  saved = Object.fromEntries(VARS.map((v) => [v, process.env[v]]));
  for (const v of VARS) delete process.env[v];
});
afterEach(() => {
  for (const v of VARS) if (saved[v] === undefined) delete process.env[v];
  else process.env[v] = saved[v];
});

const MAP = "clan=rsyounglings.com,jonnybot=jonnybot.rsclans.example,hub=rsclans.example,events=events.rsclans.example,api=api.rsclans.example,link=link.rsclans.example";

test("without the map: today's prefix rule, unchanged", () => {
  const apex = "rsyounglings.com";
  const cases = {
    "rsyounglings.com": "clan",
    "www.rsyounglings.com": "clan",
    "RSYoungLings.com:443": "clan",
    "jonnybot.rsyounglings.com": "jonnybot",
    "api.rsyounglings.com": "api",
    "clans.rsyounglings.com": "hub",
    "typo.rsyounglings.com": "unknown",
    "localhost:3000": "clan",
    "something.up.railway.app": "clan",
  };
  for (const [host, kind] of Object.entries(cases)) assert.equal(classifyHost(host, apex), kind, host);
  assert.equal(classifyHost(null, apex), "clan");
  assert.equal(classifyHost("jonnybot.localhost:3000", null), "jonnybot");
  assert.equal(classifyHost("anything.localhost", null), "clan");
});

test("without the map: host helpers answer as before", () => {
  process.env.AUTH_COOKIE_DOMAIN = ".rsyounglings.com";
  assert.equal(apexHost(), "rsyounglings.com");
  assert.equal(clanHostOf("jonnybot.rsyounglings.com"), "rsyounglings.com");
  assert.equal(jonnybotHostOf("rsyounglings.com"), "jonnybot.rsyounglings.com");
  assert.equal(apiOriginFor("rsyounglings.com"), "https://api.rsyounglings.com");
  assert.equal(subdomainMode(), false);
  delete process.env.AUTH_COOKIE_DOMAIN;
  assert.equal(clanHostOf("jonnybot.localhost:3000", null), "localhost:3000");
  assert.equal(jonnybotHostOf("localhost:3000", null), "jonnybot.localhost:3000");
  assert.equal(apiOriginFor("localhost:3000"), null);
  process.env.PUBLIC_API_ORIGIN = "https://api.example.test/";
  assert.equal(apiOriginFor("localhost:3000"), "https://api.example.test");
});

test("without the map: links stay relative on one host", () => {
  const site = siteInfoFor("localhost:3000", null, null);
  assert.equal(site.mapped, false);
  assert.equal(site.clanOrigin, "");
  assert.equal(clanHref(site, "/members"), "/members");
  assert.equal(hubHref(site, "/"), "/hub");
  assert.equal(hubHref(site, "/c/abc"), "/hub/c/abc");
  assert.equal(eventsHref(site, "/"), "/hub/events");
  assert.equal(linkHref(site, "/"), "/link");
  assert.equal(tenantSlugOf("abc.rsyounglings.com"), null);
});

test("the map names each face's host", () => {
  process.env.SITE_HOSTS = MAP;
  const cases = {
    "rsyounglings.com": "clan",
    "jonnybot.rsclans.example": "jonnybot",
    "rsclans.example": "hub",
    "events.rsclans.example": "events",
    "api.rsclans.example": "api",
    "link.rsclans.example": "link",
    // today's prefixes still work for hosts the map doesn't name
    "clans.rsyounglings.com": "hub",
    "api.rsyounglings.com": "api",
  };
  for (const [host, kind] of Object.entries(cases)) assert.equal(classifyHost(host), kind, host);
  assert.equal(apexHost(), "rsyounglings.com");
  assert.equal(subdomainMode(), true, "a mapped JonnyBot host splits the faces");
  assert.equal(jonnybotHostOf("rsyounglings.com"), "jonnybot.rsclans.example");
  assert.equal(clanHostOf("rsclans.example"), "rsyounglings.com");
  assert.equal(apiOriginFor("rsyounglings.com"), "https://api.rsclans.example");
});

test("PUBLIC_API_ORIGIN still wins over the map", () => {
  process.env.SITE_HOSTS = MAP;
  process.env.PUBLIC_API_ORIGIN = "https://other.example.test";
  assert.equal(apiOriginFor("rsyounglings.com"), "https://other.example.test");
});

test("with the map, links point at the mapped hosts", () => {
  process.env.SITE_HOSTS = MAP;
  const onClan = siteInfoFor("rsyounglings.com", "https", "clan");
  assert.equal(onClan.mapped, true);
  assert.equal(hubHref(onClan, "/c/abc"), "https://rsclans.example/c/abc");
  assert.equal(eventsHref(onClan, "/"), "https://events.rsclans.example/");
  assert.equal(linkHref(onClan, "/start"), "https://link.rsclans.example/start");
  const onHub = siteInfoFor("rsclans.example", "https", "hub");
  assert.equal(hubHref(onHub, "/c/abc"), "/c/abc");
  assert.equal(clanHref(onHub, "/members"), "https://rsyounglings.com/members");
  assert.equal(onHub.jonnybotOrigin, "https://jonnybot.rsclans.example");
});

test("aliases are old hosts of a face; the canonical host is never an alias", () => {
  process.env.SITE_HOSTS = MAP;
  process.env.SITE_HOST_ALIASES = "clans.rsyounglings.com=hub, jonnybot.rsyounglings.com=jonnybot, api.rsyounglings.com=api, rsclans.example=clan, bad.example=nope";
  assert.deepEqual(resolveHost("clans.rsyounglings.com"), { kind: "hub", alias: true });
  assert.deepEqual(resolveHost("api.rsyounglings.com:443"), { kind: "api", alias: true });
  assert.deepEqual(resolveHost("rsclans.example"), { kind: "hub", alias: false });
  assert.deepEqual(resolveHost("rsyounglings.com"), { kind: "clan", alias: false });
  assert.equal(classifyHost("bad.example", "rsyounglings.com"), "clan", "an unknown face is ignored");
});

test("tenant suffix: one-label slugs, reserved ones refused", () => {
  process.env.SITE_HOSTS = MAP;
  process.env.SITE_TENANT_SUFFIX = ".rsclans.example";
  assert.equal(tenantSlugOf("younglings.rsclans.example"), "younglings");
  assert.equal(classifyHost("younglings.rsclans.example"), "site");
  assert.equal(classifyHost("events.rsclans.example"), "events", "the map wins over the suffix");
  assert.equal(tenantSlugOf("www.rsclans.example"), null);
  assert.equal(tenantSlugOf("admin.rsclans.example"), null);
  assert.equal(tenantSlugOf("a.b.rsclans.example"), null);
  assert.equal(tenantSlugOf("-bad.rsclans.example"), null);
  assert.equal(tenantSlugOf("rsclans.example"), null);
  assert.equal(isReservedSlug("Staging"), true);
  assert.equal(isReservedSlug("jonnybot"), true);
  assert.equal(isReservedSlug("younglings"), false);
});

test("a mapped host's first label is reserved", () => {
  process.env.SITE_HOSTS = "events=raids.rsclans.example";
  process.env.SITE_TENANT_SUFFIX = "rsclans.example";
  assert.equal(isReservedSlug("raids"), true);
  assert.equal(classifyHost("raids.rsclans.example"), "events");
});

test("a malformed map is ignored, not fatal", () => {
  process.env.SITE_HOSTS = "nonsense,,=x,clan=,hub=HTTPS://Rsclans.Example/path";
  assert.equal(classifyHost("rsclans.example"), "hub");
  assert.equal(classifyHost("jonnybot.rsyounglings.com", "rsyounglings.com"), "jonnybot");
});
