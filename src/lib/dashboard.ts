import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { AdminUnavailableError } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { createGuildContext, whoAmI, type ApiResult, type GuildContext } from "@/lib/jonnybot-admin";

/**
 * The gates in front of the bot dashboard (/dashboard), which any Discord server's owner will eventually use. Like
 * `requireAdmin` for the clan's own console, call one at the top of every dashboard page AND every dashboard Server Action:
 * layouts don't re-render on client-side navigation, and a Server Action can be POSTed directly.
 *
 * While the dashboard is in beta only people who are admins of the clan's own server can open it, and everyone else gets
 * a plain 404 so the page doesn't even announce itself. Setting `DASHBOARD_PUBLIC=true` removes that one check and lets
 * any signed-in Discord user in; each server is still checked on its own (see {@link requireGuild}), so opening it up
 * never lets anyone manage a server they don't run.
 */

export interface DashboardUser {
  readonly id: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
}

/** The beta check. Fails closed: if the bot can't be asked, access is refused rather than guessed. */
async function betaAllows(userId: string): Promise<boolean> {
  if (process.env.DASHBOARD_PUBLIC === "true") return true;
  const result = await whoAmI(userId);
  if (!result.ok) throw new AdminUnavailableError();
  return result.data.allowed && result.data.tier !== "NONE";
}

/** A signed-in user who may see the dashboard at all. Not signed in goes to sign-in; no beta access is a 404. */
export async function requireDashboardUser(returnTo = "/dashboard"): Promise<DashboardUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(returnTo)}`);
  if (!(await betaAllows(session.user.id))) notFound();

  return { id: session.user.id, displayName: session.user.name ?? "Member", avatarUrl: session.user.image ?? null };
}

/**
 * Permission to manage one particular server. The user comes from the verified login session, and the bot is asked,
 * on every call, whether that person may manage *this server* by *its* rules (its owner, someone with Administrator or
 * Manage Server, or its own Admin role). Someone who may not, or a server JonnyBot isn't in, gets a 404, so the
 * dashboard never confirms a server exists to a person with no business in it.
 */
export async function requireGuild(guildId: string, returnTo?: string): Promise<GuildContext & { guildName: string; guildIconUrl: string | null }> {
  if (!/^\d{1,20}$/.test(guildId)) notFound();
  const user = await requireDashboardUser(returnTo ?? `/dashboard/${guildId}`);

  const result = await whoAmI(user.id, guildId);
  if (!result.ok) {
    if (result.status === 404) notFound();
    throw new AdminUnavailableError();
  }
  if (!result.data.allowed || result.data.tier === "NONE") notFound();

  const context = createGuildContext({
    actorId: user.id,
    guildId,
    displayName: result.data.displayName ?? user.displayName,
    avatarUrl: result.data.avatarUrl ?? user.avatarUrl,
    tier: result.data.tier,
  });
  return Object.assign(context, { guildName: result.data.guildName ?? "this server", guildIconUrl: result.data.guildIconUrl ?? null });
}

/** For page data: the value, a 404 page for "doesn't exist", or an error the dashboard's error boundary shows. */
export function dashboardData<T>(result: ApiResult<T>): T {
  if (result.ok) return result.data;
  if (result.status === 404) notFound();
  if (result.status === 0) throw new AdminUnavailableError();
  throw new Error(result.error);
}

/** The bits Discord's permission system calls the bot needs in a server: what its features actually do. Added together for the invite link. */
const BOT_PERMISSION_BITS = [
  4, // Manage Channels (ticket channels)
  6, // Add Reactions
  7, // View Audit Log (the audit-log relay)
  10, // View Channels
  11, // Send Messages
  13, // Manage Messages
  14, // Embed Links
  15, // Attach Files (ticket transcripts)
  16, // Read Message History
  17, // Mention @everyone, @here and All Roles (ticket role pings)
  18, // Use External Emojis
  28, // Manage Roles (verification, helper and self-assigned roles)
  34, // Manage Threads
  35, // Create Public Threads
  36, // Create Private Threads
  38, // Send Messages in Threads
];

/** The link that asks Discord to add JonnyBot to a server the person picks, or null if the bot's application id isn't configured. */
export function installUrl(): string | null {
  const clientId = process.env.DISCORD_BOT_CLIENT_ID ?? process.env.DISCORD_CLIENT_ID;
  if (!clientId) return null;
  const permissions = BOT_PERMISSION_BITS.reduce((sum, bit) => sum + 2 ** bit, 0);
  return `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&permissions=${permissions}&scope=${encodeURIComponent("bot applications.commands")}`;
}
