import { forwardToBot } from "@/lib/pluginProxy";

/** POST /api/ingest/v1/runesync/diagnostics: a redacted bug-report snapshot from RuneSync's panel; answers its short id (kept 14 days). */
export async function POST(request: Request) {
  return forwardToBot(request, "/internal/plugin/runesync/diagnostics", "POST");
}
