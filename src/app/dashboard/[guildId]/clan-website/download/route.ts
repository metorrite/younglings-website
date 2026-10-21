import { strToU8, zipSync } from "fflate";
import { requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";

export const dynamic = "force-dynamic";

/**
 * "Download my site" (design B2/W11): a zip of everything the clan wrote for its website: `site.json` (look, pages, blocks) and
 * `images.txt` (the addresses of the images it used). The images themselves stay where the clan put them: fetching addresses a clan typed
 * from our server would let anyone make it call any address. Checked like every dashboard call.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const result = await adminApi.exportClanSite(guild);
  if (!result.ok) return new Response("Not available", { status: result.status === 0 ? 503 : 404 });

  const images = Array.isArray(result.data.images) ? (result.data.images as unknown[]).filter((u): u is string => typeof u === "string") : [];
  const readme = "Your JonnyBot clan website, as you wrote it.\n\nsite.json: the look, the pages and every block.\nimages.txt: the addresses of the images you used (download them from there).\n";
  const zip = zipSync({
    "README.txt": strToU8(readme),
    "site.json": strToU8(JSON.stringify(result.data, null, 2)),
    "images.txt": strToU8(images.join("\n") + (images.length ? "\n" : "")),
  });
  const slug = typeof result.data.slug === "string" && /^[a-z0-9-]{1,63}$/.test(result.data.slug) ? result.data.slug : "clan";
  return new Response(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}-website.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
