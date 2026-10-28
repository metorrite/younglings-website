// Run with: node --test tests/*.test.mjs   (Node 22.18+/24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { test } from "node:test";
import { hubBaseUrl, hubCall, hubLinkPath, hubPluginPath } from "../src/lib/hub.ts";
import { clientIpFrom } from "../src/lib/clientIp.ts";

test("the hub is used only when HUB_BASE_URL is a safe address", () => {
  assert.equal(hubBaseUrl({}), null);
  assert.equal(hubBaseUrl({ HUB_BASE_URL: "  " }), null);
  assert.equal(hubBaseUrl({ HUB_BASE_URL: "http://localhost:8090/" }), "http://localhost:8090");
  assert.equal(hubBaseUrl({ HUB_BASE_URL: "https://hub.example.org" }), "https://hub.example.org");
  assert.equal(hubBaseUrl({ HUB_BASE_URL: "http://hub.example.org" }), null, "plain http only for private hosts");
  assert.equal(hubBaseUrl({ HUB_BASE_URL: "http://runeclans-hub.railway.internal:8090" }), "http://runeclans-hub.railway.internal:8090");
  for (const ok of ["http://10.0.0.5:8090", "http://172.16.0.1", "http://172.31.255.1", "http://192.168.1.20", "http://[::1]:8090"]) {
    assert.equal(hubBaseUrl({ HUB_BASE_URL: ok }), ok, ok);
  }
  for (const bad of ["http://172.32.0.1", "http://8.8.8.8", "http://railway.internal.example.org", "http://evil.com/.railway.internal", "https://u:p@hub.example.org"]) {
    assert.equal(hubBaseUrl({ HUB_BASE_URL: bad }), null, bad);
  }
});

test("RS Link routes map to the hub's /v1/link and /web/link", () => {
  assert.equal(hubLinkPath("v1/pair/start"), "/v1/link/pair/start");
  assert.equal(hubLinkPath("v1/keys"), "/v1/link/keys");
  assert.equal(hubLinkPath("web/code"), "/web/link/code");
  assert.equal(hubLinkPath("web/delete-my-data"), "/web/link/delete-my-data");
  assert.equal(hubLinkPath("resolve"), null, "first-party resolve is never reachable through the website");
  assert.equal(hubLinkPath("v1/../admin"), null);
});

test("RuneSync's routes move to the hub, except JonnyBot's clan panel", () => {
  assert.equal(hubPluginPath("/internal/plugin/ingest"), "/v1/plugin/ingest");
  assert.equal(hubPluginPath("/internal/plugin/whoami"), "/v1/plugin/whoami");
  assert.equal(hubPluginPath("/internal/plugin/runesync/consent"), "/v1/plugin/runesync/consent");
  assert.equal(hubPluginPath("/internal/plugin/runesync/diagnostics"), "/v1/plugin/runesync/diagnostics");
  assert.equal(hubPluginPath("/internal/plugin/runesync/config?client=RuneSync%200.0.9&paused=false"), "/v1/plugin/runesync/config?client=RuneSync%200.0.9&paused=false");
  assert.equal(hubPluginPath("/internal/plugin/runesync/panel"), null);
  assert.equal(hubPluginPath("/internal/plugin/me"), null);
});

test("without the web secret nothing is sent", async () => {
  assert.equal(await hubCall("/health", {}, { HUB_BASE_URL: "http://localhost:1" }), null);
});

test("T-175: a spoofed first X-Forwarded-For entry is ignored; the right-most hop wins", () => {
  const h = (o) => new Headers(o);
  assert.equal(clientIpFrom(h({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }), {}), "203.0.113.9");
  assert.equal(clientIpFrom(h({ "x-forwarded-for": "1.2.3.4, 203.0.113.9, 10.0.0.2" }), { TRUSTED_PROXY_HOPS: "2" }), "203.0.113.9");
  assert.equal(clientIpFrom(h({ "x-forwarded-for": "10.0.0.2" }), { TRUSTED_PROXY_HOPS: "nonsense" }), "10.0.0.2");
});

test("T-175: the configured header wins when present, else the right-most hop; local dev still works", () => {
  const h = (o) => new Headers(o);
  const env = { CLIENT_IP_HEADER: "CF-Connecting-IP" };
  assert.equal(clientIpFrom(h({ "cf-connecting-ip": "198.51.100.7", "x-forwarded-for": "1.2.3.4, 162.158.0.1" }), env), "198.51.100.7");
  assert.equal(clientIpFrom(h({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }), env), "203.0.113.9");
  assert.equal(clientIpFrom(h({ "x-real-ip": "127.0.0.1" }), {}), "127.0.0.1");
  assert.equal(clientIpFrom(h({}), {}), "unknown");
});
