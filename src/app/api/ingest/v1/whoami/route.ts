import { forwardToBot } from "@/lib/pluginProxy";
import { apiOriginFor } from "@/lib/siteHosts";

/** GET /api/ingest/v1/whoami: which RuneScape names this token may report for, and which categories the player has allowed. */
export async function GET(request: Request) {
  const answer = await forwardToBot(request, "/internal/plugin/whoami", "GET");
  if (!answer.ok) return answer;
  // Tell the plugin where the API lives now, so a future move of the API host is followed without a plugin release.
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  const json = (await answer.json()) as Record<string, unknown>;
  const apiBase = apiOriginFor(host, request.headers.get("x-forwarded-proto"));
  return new Response(JSON.stringify(apiBase ? { ...json, apiBase } : json), { status: answer.status, headers: answer.headers });
}
