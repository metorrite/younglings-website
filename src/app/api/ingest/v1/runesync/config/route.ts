import { forwardToBot } from "@/lib/pluginProxy";

/**
 * GET /api/ingest/v1/runesync/config: what RuneSync asks for on login and every ~10 minutes (consent, panelAvailable, minClientVersion,
 * sendEverySeconds). Only `client` (its name and version) and `paused` are passed on, for the member's device card on their profile.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const pass = new URLSearchParams();
  const client = query.get("client");
  if (client) pass.set("client", client.slice(0, 80));
  if (query.get("paused") === "true") pass.set("paused", "true");
  const suffix = pass.size > 0 ? `?${pass.toString()}` : "";
  return forwardToBot(request, `/internal/plugin/runesync/config${suffix}`, "GET");
}
