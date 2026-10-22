import { forwardToBot } from "@/lib/pluginProxy";

/**
 * GET /api/ingest/v1/runesync/panel: the data for RuneSync's optional in-game clan panel (T-206). For each of the member's clans that
 * switched the panel on: open and running events, the member's own points and own progress. The bot caches it 60 seconds per member.
 */
export async function GET(request: Request) {
  return forwardToBot(request, "/internal/plugin/runesync/panel", "GET");
}
