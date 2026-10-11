import { botCall } from "@/lib/botCall";
import { apiError, apiJson, limited, preflight, unavailable } from "@/lib/publicApi";

export const OPTIONS = preflight;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** POST /api/v1/clans/{slug}/report with `{ "reason": "..." }`: tells the bot's owner about a listing that breaks the rules. Three per ten minutes per address. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const early = limited(request, "publicReport");
  if (early) return early;
  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 40) return apiError(404, "No such clan.");

  let reason = "";
  try {
    const body = (await request.json()) as { reason?: unknown };
    reason = typeof body.reason === "string" ? body.reason.trim() : "";
  } catch {
    return apiError(400, "Send JSON like {\"reason\": \"what is wrong\"}.");
  }
  if (reason.length < 10 || reason.length > 500) return apiError(400, "Say what is wrong, in 10 to 500 characters.");

  const answer = await botCall(`/internal/directory/clans/${slug}/report`, { method: "POST", body: JSON.stringify({ reason, reporter: "public site" }) });
  if (!answer) return unavailable();
  if (answer.status === 404) return apiError(404, "No such clan.");
  if (answer.status === 429) return apiError(429, "This clan has been reported a lot today already. It will be looked at.");
  if (answer.status >= 400) return unavailable();
  return apiJson({ received: true }, 202, false);
}
