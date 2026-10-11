import { botCall } from "@/lib/botCall";
import { apiError, apiJson, limited, preflight, unavailable } from "@/lib/publicApi";

export const OPTIONS = preflight;

/** GET /api/v1/leaderboards?period=week|month: clans that opted in, ranked by the XP their members gained. Totals only, never a member's own figure. */
export async function GET(request: Request) {
  const early = limited(request, "publicRead");
  if (early) return early;

  const period = (new URL(request.url).searchParams.get("period") ?? "week").trim().toLowerCase();
  if (period !== "week" && period !== "month") return apiError(400, "period must be week or month.");

  const answer = await botCall(`/internal/directory/leaderboards?period=${period}`, { revalidate: 300 });
  if (!answer || answer.status !== 200) return unavailable();
  return apiJson(answer.json);
}
