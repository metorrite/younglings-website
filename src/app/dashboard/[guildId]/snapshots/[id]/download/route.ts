import { requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";

export const dynamic = "force-dynamic";

const ID = /^snap-\d{8}-\d{6}-[0-9a-f]{4}$/;

/** A stored snapshot's zip. Checked like every dashboard call; the bot also refuses anyone who isn't its owner, and a refusal looks like a missing file. */
export async function GET(_request: Request, { params }: { params: Promise<{ guildId: string; id: string }> }) {
  const { guildId, id } = await params;
  const guild = await requireGuild(guildId);
  if (!ID.test(id)) return new Response("Not found", { status: 404 });

  const result = await adminApi.devSnapshot(guild, id);
  if (!result.ok) return new Response("Not found", { status: result.status === 0 ? 503 : 404 });

  return new Response(Buffer.from(result.data.zipBase64, "base64"), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${id}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
