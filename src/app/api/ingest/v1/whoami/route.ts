import { forwardToBot } from "@/lib/pluginProxy";

/** GET /api/ingest/v1/whoami: which RuneScape names this token may report for, and which categories the player has allowed. */
export async function GET(request: Request) {
  return forwardToBot(request, "/internal/plugin/whoami", "GET");
}
