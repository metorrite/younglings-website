import { cache } from "react";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { AdminUnavailableError } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { currentSite } from "@/lib/siteHostsServer";
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
  // `beta` also lets in the admins of the trusted beta servers; an older bot without it falls back to the clan's own admins.
  return result.data.beta ?? (result.data.allowed && result.data.tier !== "NONE");
}

/** A signed-in user who may see the dashboard at all. Not signed in goes to sign-in; no beta access is a 404. */
export async function requireDashboardUser(returnTo = "/dashboard"): Promise<DashboardUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    // On JonnyBot's own host come back to that host after signing in, not to the host that finishes the sign-in.
    const site = await currentSite();
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(site.split ? `${site.jonnybotOrigin}${returnTo}` : returnTo)}`);
  }
  if (!(await betaAllows(session.user.id))) notFound();

  return { id: session.user.id, displayName: session.user.name ?? "Member", avatarUrl: session.user.image ?? null };
}

/**
 * Asks the bot who this person is in this server. A page and its layout both call {@link requireGuild} in one request, so this asks once and both
 * get the answer (React's cache lasts for a single request only, so a later request always asks again).
 */
const whoAmIOncePerRequest = cache((actorId: string, guildId: string) => whoAmI(actorId, guildId));

/**
 * Permission to manage one particular server. The user comes from the verified login session, and the bot is asked,
 * on every call, whether that person may manage *this server* by *its* rules (its owner, someone with Administrator or
 * Manage Server, or its own Admin role). Someone who may not, or a server JonnyBot isn't in, gets a 404, so the
 * dashboard never confirms a server exists to a person with no business in it.
 */
export async function requireGuild(guildId: string, returnTo?: string): Promise<GuildContext & { guildName: string; guildIconUrl: string | null }> {
  const guild = await resolveGuild(guildId, returnTo, false);
  return guild;
}

/**
 * {@link requireGuild} that also lets an Event coordinator in. Only the event manager's pages, its actions and the dashboard shell call this; every
 * other page keeps using requireGuild, which refuses a coordinator with a 404, and the bot refuses a coordinator on every route but the event ones, so
 * a coordinator can never reach more than the events however they get there. The context's `tier` says COORDINATOR for them.
 */
export async function requireEventAccess(guildId: string, returnTo?: string): Promise<GuildContext & { guildName: string; guildIconUrl: string | null }> {
  return resolveGuild(guildId, returnTo, true);
}

async function resolveGuild(guildId: string, returnTo: string | undefined, allowCoordinator: boolean): Promise<GuildContext & { guildName: string; guildIconUrl: string | null }> {
  if (!/^\d{1,20}$/.test(guildId)) notFound();
  const user = await requireDashboardUser(returnTo ?? `/dashboard/${guildId}`);

  const result = await whoAmIOncePerRequest(user.id, guildId);
  if (!result.ok) {
    if (result.status === 404) notFound();
    throw new AdminUnavailableError();
  }
  const coordinator = allowCoordinator && result.data.coordinator === true && !result.data.allowed;
  if (!coordinator && (!result.data.allowed || result.data.tier === "NONE")) notFound();

  const context = createGuildContext({
    actorId: user.id,
    guildId,
    displayName: result.data.displayName ?? user.displayName,
    avatarUrl: result.data.avatarUrl ?? user.avatarUrl,
    tier: coordinator ? "COORDINATOR" : result.data.tier === "NONE" ? "ADMIN" : result.data.tier,
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
  26, // Change Nickname (the server can give JonnyBot its own nickname)
  28, // Manage Roles (verification, helper and self-assigned roles)
  34, // Manage Threads
  35, // Create Public Threads
  36, // Create Private Threads
  38, // Send Messages in Threads
];

/**
 * Permissions a server can add on top of the minimal set, each only for features it switches on. They are left off the default link so a server
 * that never uses them never grants them; the install page offers them as checkboxes.
 */
export const OPTIONAL_PERMISSIONS = [
  { id: "moderation", label: "Moderation actions", detail: "Kick, Ban and Timeout. Needed for warning punishments (timeout, kick, ban after enough warnings) and for kicking brand-new accounts.", bits: [1, 2, 40] },
] as const;

const permissionsOf = (bits: readonly number[]) => bits.reduce((sum, bit) => sum + 2 ** bit, 0);
const BASE_PERMISSIONS = permissionsOf(BOT_PERMISSION_BITS);

function inviteLink(clientId: string, permissions: number): string {
  return `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&permissions=${permissions}&scope=${encodeURIComponent("bot applications.commands")}`;
}

/** The link that asks Discord to add JonnyBot to a server the person picks, or null if the bot's application id isn't configured. Minimal permissions only. */
export function installUrl(): string | null {
  const clientId = process.env.DISCORD_BOT_CLIENT_ID ?? process.env.DISCORD_CLIENT_ID;
  return clientId ? inviteLink(clientId, BASE_PERMISSIONS) : null;
}

/** What the install page needs to build a link with the optional extras the person ticks: the app id, the minimal permissions and each extra's value. */
export function installOptions(): { clientId: string; base: number; extras: { id: string; label: string; detail: string; value: number }[] } | null {
  const clientId = process.env.DISCORD_BOT_CLIENT_ID ?? process.env.DISCORD_CLIENT_ID;
  if (!clientId) return null;
  return { clientId, base: BASE_PERMISSIONS, extras: OPTIONAL_PERMISSIONS.map((e) => ({ id: e.id, label: e.label, detail: e.detail, value: permissionsOf(e.bits) })) };
}
