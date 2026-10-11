import { botCall } from "@/lib/botCall";
import { apiJson, limited, preflight, unavailable } from "@/lib/publicApi";

export const OPTIONS = preflight;

/** GET /api/v1/events: upcoming events that listed clans share publicly, soonest first, each with the clan that hosts it. */
export async function GET(request: Request) {
  const early = limited(request, "publicRead");
  if (early) return early;

  const answer = await botCall("/internal/directory/events", { revalidate: 30 });
  if (!answer || answer.status !== 200) return unavailable();
  return apiJson(answer.json);
}
