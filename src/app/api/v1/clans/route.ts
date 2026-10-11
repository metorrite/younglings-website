import { botCall } from "@/lib/botCall";
import { apiError, apiJson, limited, preflight, unavailable } from "@/lib/publicApi";

interface Clan {
  slug: string;
  name: string;
  tagline: string;
  focus: { key: string }[];
  recruiting: { key: string };
}

export const OPTIONS = preflight;

/** GET /api/v1/clans: every publicly listed clan. Optional filters: `q` (text in the name or tagline), `recruiting` (OPEN, INVITE_ONLY, CLOSED), `focus` (e.g. PVM). */
export async function GET(request: Request) {
  const early = limited(request, "publicRead");
  if (early) return early;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 60);
  const recruiting = (url.searchParams.get("recruiting") ?? "").trim().toUpperCase();
  const focus = (url.searchParams.get("focus") ?? "").trim().toUpperCase();
  if (recruiting && !["OPEN", "INVITE_ONLY", "CLOSED"].includes(recruiting)) return apiError(400, "recruiting must be OPEN, INVITE_ONLY or CLOSED.");

  const answer = await botCall<{ clans?: Clan[]; generatedAt?: string }>("/internal/directory/clans", { revalidate: 30 });
  if (!answer || answer.status !== 200) return unavailable();

  const clans = (answer.json.clans ?? []).filter(
    (c) =>
      (!q || c.name.toLowerCase().includes(q) || c.tagline.toLowerCase().includes(q)) &&
      (!recruiting || c.recruiting.key === recruiting) &&
      (!focus || c.focus.some((f) => f.key === focus)),
  );
  return apiJson({ clans, count: clans.length, generatedAt: answer.json.generatedAt ?? null });
}
