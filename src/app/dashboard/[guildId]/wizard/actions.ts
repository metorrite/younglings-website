"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type PermissionGroupDraft, type WelcomeActionResult, type WelcomeConfig } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";
import { welcomeDraftFrom } from "@/lib/welcomeDraft";

/**
 * The setup wizard's quick steps. Each one changes only what its questions asked about and leaves everything else in that area as it
 * is, by reading the current settings and saving the whole thing back with that one change. Like every dashboard action each starts
 * by checking the signed-in user against *that* server; the bot then checks every value again and refuses what it can't use.
 */

type Result = WelcomeActionResult<null>;

const ok: Result = { ok: true, data: null };
const id = (v: unknown): string | null => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);
const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^\d{1,20}$/.test(x)).slice(0, 25) : []);

/** Turns a refused call into the wizard's result, keeping the bot's own list of reasons. */
function refused(result: Extract<ApiResult<unknown>, { ok: false }>): Result {
  return { ok: false, error: result.error, problems: result.problems };
}

async function begin(guildId: string) {
  const guild = await requireGuild(guildId);
  return { guild, slow: throttle(guild.actorId, "admin") };
}

// ---------- admins and staff ----------

export async function quickSavePermissionsAction(guildId: string, input: { adminRoleIds: unknown; supportRoleIds: unknown }): Promise<Result> {
  const { guild, slow } = await begin(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };

  const current = await adminApi.permissions(guild);
  if (!current.ok) return refused(current);

  const adminRoleIds = ids(input.adminRoleIds);
  const supportRoleIds = ids(input.supportRoleIds);
  // everything the server already has is sent back unchanged except the two lists the questions asked about
  const drafts: PermissionGroupDraft[] = current.data.groups.map((g) => ({
    key: g.key,
    name: g.name,
    includeHigher: g.includeHigher,
    roleIds: g.key === "admin" ? adminRoleIds : g.key === "support" ? supportRoleIds : g.roleIds,
  }));

  const saved = await adminApi.savePermissions(guild, drafts);
  revalidatePath(`/dashboard/${guildId}`);
  return saved.ok ? ok : refused(saved);
}

// ---------- clan and link requests ----------

export async function quickSaveClanAction(
  guildId: string,
  input: { clanName: unknown; reviewChannelId: unknown },
): Promise<Result> {
  const { guild, slow } = await begin(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };

  const current = await adminApi.serverSetup(guild);
  if (!current.ok) return refused(current);

  const clan = typeof input.clanName === "string" ? input.clanName.trim().slice(0, 30) : "";
  const saved = await adminApi.saveServerSetup(guild, {
    ...current.data,
    clanName: clan === "" ? null : clan,
    clanEnabled: clan === "" ? current.data.clanEnabled : true,
    verificationReviewChannelId: id(input.reviewChannelId),
  });
  revalidatePath(`/dashboard/${guildId}`);
  return saved.ok ? ok : refused(saved);
}

// ---------- clan event feeds ----------

export async function quickSaveTrackingAction(guildId: string, input: { channelId: unknown }): Promise<Result> {
  const { guild, slow } = await begin(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };

  const channelId = id(input.channelId);
  const current = await adminApi.tracking(guild);
  if (!current.ok) return refused(current);

  // one channel for every kind of event: on with that channel, or all switched off when none was chosen
  for (const group of current.data.groups) {
    const saved = await adminApi.saveTracking(guild, group.key, { enabled: channelId !== null, channelIds: channelId ? [channelId] : [] });
    if (!saved.ok) return refused(saved);
  }
  revalidatePath(`/dashboard/${guildId}`);
  return ok;
}

// ---------- welcome ----------

export async function quickSaveWelcomeAction(guildId: string, input: { enabled: unknown; channelId: unknown; text: unknown }): Promise<Result> {
  const { guild, slow } = await begin(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };

  const current = await adminApi.welcome(guild);
  if (!current.ok) return refused(current);

  const { channelName, serverName, memberCount, serverIconUrl, ...saved }: WelcomeConfig = current.data;
  void channelName;
  void serverName;
  void memberCount;
  void serverIconUrl;
  const enabled = input.enabled === true;
  const text = typeof input.text === "string" ? input.text.trim() : "";
  const draft = welcomeDraftFrom({
    ...saved,
    enabled,
    channelId: id(input.channelId),
    // new text means a plain line of text (the full editor is where embeds live); no text leaves the current message exactly as it is
    ...(text === "" ? {} : { messageType: "MESSAGE", content: text }),
  });
  if (!draft) return { ok: false, error: "That welcome message couldn't be read.", problems: [] };

  const result = await adminApi.saveWelcome(guild, draft);
  revalidatePath(`/dashboard/${guildId}`);
  return result.ok ? ok : refused(result);
}

// ---------- commands ----------

export async function quickSaveCommandsAction(guildId: string, input: { enabled: unknown }): Promise<Result> {
  const { guild, slow } = await begin(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input.enabled !== "object" || input.enabled === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };

  // only the on/off switch is sent, so who may use each command and where stay exactly as they are
  for (const [key, on] of Object.entries(input.enabled as Record<string, unknown>)) {
    if (!/^[a-z0-9_-]{1,32}$/.test(key)) continue;
    const saved = await adminApi.saveHubCommand(guild, key, { enabled: on === true });
    if (!saved.ok) return refused(saved);
  }
  revalidatePath(`/dashboard/${guildId}`);
  return ok;
}
