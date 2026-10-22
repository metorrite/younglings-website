import { forwardToBot } from "@/lib/pluginProxy";

/**
 * POST (or PUT) /api/ingest/v1/runesync/consent: RuneSync's in-game category switches, written to the same record as the profile's
 * Plugin tab. The game client can only send GET and POST, so POST is the one RuneSync uses.
 */
export async function POST(request: Request) {
  return forwardToBot(request, "/internal/plugin/runesync/consent", "POST");
}

export async function PUT(request: Request) {
  return forwardToBot(request, "/internal/plugin/runesync/consent", "PUT");
}
