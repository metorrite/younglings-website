/**
 * A player's RuneScape chathead, passed through from the game's own avatar service. The site's pages ask this route
 * rather than RuneScape directly, so a page with a hundred names makes one request per name to RuneScape (then none
 * for a day, because the answer is cached) instead of a hundred per visitor.
 *
 * RuneScape answers 100x100 PNGs. A name that never customised its look gets the game's default helmet; that is passed
 * through as it is, since it is what the game itself shows.
 */
const RSN = /^[A-Za-z0-9 _-]{1,12}$/;
const MAX_BYTES = 200_000;

export async function GET(_request: Request, { params }: { params: Promise<{ rsn: string }> }) {
  const { rsn: raw } = await params;
  // the clan list spells a space as a non-breaking space; plus-signs and %20 both mean a space in a URL path here
  const rsn = decodeURIComponent(raw).replace(/ /g, " ").trim();
  if (!RSN.test(rsn)) return new Response("Not a RuneScape name", { status: 400 });

  const unavailable = () => new Response("Chathead unavailable", { status: 502, headers: { "Cache-Control": "public, max-age=60" } });

  try {
    const upstream = await fetch(`https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(rsn)}/chat.png`, {
      redirect: "follow",
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(8_000),
    });
    const type = upstream.headers.get("content-type") ?? "";
    // only ever relay an image that really came from RuneScape, even after its redirect to the player's own picture
    if (!upstream.ok || !type.startsWith("image/") || new URL(upstream.url).hostname !== "secure.runescape.com") return unavailable();

    const body = await upstream.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return unavailable();

    const customised = !new URL(upstream.url).pathname.endsWith("default_chat.png");
    return new Response(body, {
      headers: {
        "Content-Type": type,
        // a look can change in game, so don't keep a customised one forever; the default is re-checked sooner so a first customisation shows up
        "Cache-Control": customised ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" : "public, max-age=600, s-maxage=3600",
      },
    });
  } catch {
    return unavailable();
  }
}
