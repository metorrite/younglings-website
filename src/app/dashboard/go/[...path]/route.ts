import { requireDashboardUser } from "@/lib/dashboard";
import { whoAmI } from "@/lib/jonnybot-admin";

export const dynamic = "force-dynamic";

/**
 * Where the old /admin addresses of the bot's pages (see `redirects` in next.config.ts) end up. The home server is whichever server the bot's own
 * answer names for this person (the clan's server), so /admin/tickets becomes /dashboard/<that server>/tickets. Anyone who may not use the dashboard,
 * or whom the bot cannot place, lands on the server picker instead. Only plain page names are followed (never a full address), so this cannot be used
 * to send someone off the site.
 */
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(request.url);
  const returnTo = `${url.pathname}${url.search}`;
  const user = await requireDashboardUser(returnTo);

  const safe = path.every((segment) => /^[A-Za-z0-9_-]{1,60}$/.test(segment));
  const who = await whoAmI(user.id);
  const guildId = who.ok && who.data.allowed && who.data.tier !== "NONE" ? who.data.guildId : undefined;
  const base = guildId && /^\d{1,20}$/.test(guildId) && safe ? `/dashboard/${guildId}/${path.join("/")}` : "/dashboard";
  return new Response(null, { status: 307, headers: { Location: `${base}${base === "/dashboard" ? "" : url.search}` } });
}
