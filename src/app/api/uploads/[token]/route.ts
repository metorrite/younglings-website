import { fetchUploadedImage } from "@/lib/jonnybot-admin";

/**
 * A picture a server uploaded for one of its messages (a welcome embed's thumbnail, say), served from the bot's database. Public on
 * purpose, because Discord has to fetch it to show the embed; the address names an unguessable token, and only a few safe picture
 * types are ever stored. The address changes (`?v=`) when the picture does, so it can be cached for a while.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) return new Response("Not found", { status: 404 });

  const image = await fetchUploadedImage(token);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.data.byteLength),
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
