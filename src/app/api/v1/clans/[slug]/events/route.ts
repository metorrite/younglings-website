import { botCall } from "@/lib/botCall";
import { apiError, apiJson, limited, preflight, unavailable } from "@/lib/publicApi";

export const OPTIONS = preflight;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** GET /api/v1/clans/{slug}/events: the events this clan shares publicly, soonest first. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const early = limited(request, "publicRead");
  if (early) return early;
  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 40) return apiError(404, "No such clan.");

  const answer = await botCall(`/internal/directory/clans/${slug}/events`, { revalidate: 30 });
  if (!answer) return unavailable();
  if (answer.status === 404) return apiError(404, "No such clan.");
  if (answer.status !== 200) return unavailable();
  return apiJson(answer.json);
}
