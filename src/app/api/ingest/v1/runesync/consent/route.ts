import { forwardToBot } from "@/lib/pluginProxy";

/** PUT /api/ingest/v1/runesync/consent: RuneSync's in-game category switches, written to the same record as the profile's Plugin tab. */
export async function PUT(request: Request) {
  return forwardToBot(request, "/internal/plugin/runesync/consent", "PUT");
}
