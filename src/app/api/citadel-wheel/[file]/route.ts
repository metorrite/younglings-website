import { fetchWheelGif } from "@/lib/jonnybot-admin";

/**
 * A locked Citadel wheel winner's GIF, at /api/citadel-wheel/<token>.gif. Public on purpose: Discord has to fetch it to show the wheel inside a
 * pasted message, so the address holds a long random token (the same one for as long as the week stays locked) instead of asking for a login.
 * Add ?download=1 for a copy that saves as a file. The picture is never changed once drawn, so it can be cached for good.
 */
export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const match = /^([A-Za-z0-9_-]{20,64})\.gif$/.exec(file);
  if (!match) return new Response("Not found", { status: 404 });

  const gif = await fetchWheelGif(match[1]);
  if (!gif) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(gif), {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(gif.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="citadel-wheel.gif"`,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
