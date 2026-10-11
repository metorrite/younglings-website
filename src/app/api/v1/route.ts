import { apiJson } from "@/lib/publicApi";

/** GET /api/v1 (also the front page of the API host): what the API offers and where the documentation is. */
export async function GET() {
  return apiJson(
    {
      name: "JonnyBot public and plugin API",
      endpoints: {
        clans: "GET /v1/clans",
        clan: "GET /v1/clans/{slug}",
        clanEvents: "GET /v1/clans/{slug}/events",
        events: "GET /v1/events",
        leaderboards: "GET /v1/leaderboards?period=week|month",
        report: "POST /v1/clans/{slug}/report",
        pluginWhoami: "GET /ingest/v1/whoami",
        pluginEvents: "POST /ingest/v1/events",
      },
      openapi: "/openapi.yaml",
    },
  );
}
