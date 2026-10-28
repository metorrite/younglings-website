import { currentSite } from "@/lib/siteHostsServer";
import { requireGuild } from "@/lib/dashboard";
import { currentOwner } from "@/lib/devSnapshotOwner";
import { adminApi } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";
import { cleanClientState, mergeSnapshot } from "@/lib/siteSnapshot";

export const dynamic = "force-dynamic";

const MAX_BODY = 200_000;

function siteCommit(): string {
  const raw = process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "";
  return /^[A-Za-z0-9._-]{1,64}$/.test(raw) ? raw : "";
}

/**
 * The dev snapshot button's call: the owner's browser reports its own state, this asks the bot for its snapshot of the same server and answers with one
 * zip holding both. Anyone who is not the bot's owner gets a plain 404, so the route does not announce itself. A JSON body is required, which a
 * cross-site form cannot send, and the login cookie is SameSite=Lax, so another site cannot make the owner's browser take a snapshot.
 */
export async function POST(request: Request) {
  const owner = await currentOwner();
  if (!owner) return new Response("Not found", { status: 404 });
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return new Response("Expected JSON", { status: 415 });

  const slow = throttle(owner.context.actorId, "admin");
  if (slow) return Response.json({ error: slow }, { status: 429 });

  const text = await request.text();
  if (text.length > MAX_BODY) return Response.json({ error: "That report is too large." }, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return Response.json({ error: "Not JSON." }, { status: 400 });
  }
  const client = cleanClientState(raw);

  // on a dashboard page the snapshot is of that server (checked like every dashboard call); anywhere else it is of the bot's home server
  const context = client.guildId ? await requireGuild(client.guildId) : owner.context;
  const result = await adminApi.takeDevSnapshot(context, client.focus, siteCommit());
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status === 0 ? 503 : result.status === 403 ? 403 : 502 });

  const site = await currentSite();
  const zip = mergeSnapshot(Buffer.from(result.data.zipBase64, "base64"), result.data.id, client, {
    face: site.hub ? "hub" : site.jonnybot ? "jonnybot" : "clan",
    role: `bot owner (${owner.tier.toLowerCase()})`,
    siteCommit: siteCommit(),
    nodeEnv: process.env.NODE_ENV ?? "",
    serverTimeUtc: new Date().toISOString(),
  });

  return new Response(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="jb-snapshot-${result.data.id}.zip"`,
      "X-Snapshot-Id": result.data.id,
      "Cache-Control": "no-store",
    },
  });
}
