// Run with: node --test tests/*.test.mjs   (Node 22.18+/24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { test } from "node:test";
import { hubBaseUrl, hubCall, hubLinkPath, hubPluginPath } from "../src/lib/hub.ts";

test("the hub is used only when HUB_BASE_URL is a safe address", () => {
  assert.equal(hubBaseUrl({}), null);
  assert.equal(hubBaseUrl({ HUB_BASE_URL: "  " }), null);
  assert.equal(hubBaseUrl({ HUB_BASE_URL: "http://localhost:8090/" }), "http://localhost:8090");
  assert.equal(hubBaseUrl({ HUB_BASE_URL: "https://hub.example.org" }), "https://hub.example.org");
  assert.equal(hubBaseUrl({ HUB_BASE_URL: "http://hub.example.org" }), null, "plain http only for localhost");
});

test("RS Link routes map to the hub's /v1/link and /web/link", () => {
  assert.equal(hubLinkPath("v1/pair/start"), "/v1/link/pair/start");
  assert.equal(hubLinkPath("v1/keys"), "/v1/link/keys");
  assert.equal(hubLinkPath("web/code"), "/web/link/code");
  assert.equal(hubLinkPath("web/delete-my-data"), "/web/link/delete-my-data");
  assert.equal(hubLinkPath("resolve"), null, "first-party resolve is never reachable through the website");
  assert.equal(hubLinkPath("v1/../admin"), null);
});

test("only RuneSync's ingest and whoami move to the hub", () => {
  assert.equal(hubPluginPath("/internal/plugin/ingest"), "/v1/plugin/ingest");
  assert.equal(hubPluginPath("/internal/plugin/whoami"), "/v1/plugin/whoami");
  assert.equal(hubPluginPath("/internal/plugin/runesync/consent"), null);
  assert.equal(hubPluginPath("/internal/plugin/me"), null);
});

test("without the web secret nothing is sent", async () => {
  assert.equal(await hubCall("/health", {}, { HUB_BASE_URL: "http://localhost:1" }), null);
});
