import { forwardToBot } from "@/lib/pluginProxy";

/**
 * POST /api/ingest/v1/events: the plugin's batch of events (schema v1, see /openapi/jonnybot-v1.yaml). Send the plugin token as
 * `Authorization: Bearer jbp_...`. The answer says how many events were accepted, which were duplicates and which were rejected and why.
 */
export async function POST(request: Request) {
  return forwardToBot(request, "/internal/plugin/ingest", "POST");
}
