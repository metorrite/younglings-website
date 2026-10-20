import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { isKnownTagShape } from "@/lib/cacheTags";

/**
 * The bot's "this changed" signal: `POST /api/revalidate` with the shared secret in `X-Internal-Secret` and `{ "tags": ["site:polls", ...] }`.
 * Every named tag is marked stale at once (`{ expire: 0 }`: the next request refetches instead of being served the old copy), so a page shows
 * the change on its next visit rather than when its timer runs out. The timers stay as the fallback if the bot never calls. Nothing here
 * reads or returns site data, only tag names of the known shape, and without the right secret it answers 401 and does nothing.
 */
export const dynamic = "force-dynamic";

const MAX_TAGS = 30;

function secretMatches(given: string | null): boolean {
  const expected = process.env.JONNYBOT_INTERNAL_API_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // timingSafeEqual needs equal lengths; a different length is already a mismatch and leaks nothing but the length
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-internal-secret"))) return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send JSON like {\"tags\":[\"site:polls\"]}." }, { status: 400 });
  }
  const raw = typeof body === "object" && body !== null ? (body as { tags?: unknown }).tags : undefined;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TAGS) return Response.json({ error: `Send between 1 and ${MAX_TAGS} tags.` }, { status: 400 });

  const tags = [...new Set(raw)];
  const bad = tags.filter((t) => typeof t !== "string" || !isKnownTagShape(t));
  if (bad.length > 0) return Response.json({ error: "Some tags are not of the form site:<name> or hub:<name>." }, { status: 400 });

  for (const tag of tags as string[]) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags.length }, { headers: { "Cache-Control": "no-store" } });
}
