"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ChatLevelSettings, type ChatLevelTop, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const snowflake = (value: unknown): string | null => (typeof value === "string" && /^\d{1,20}$/.test(value) ? value : null);
const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
const idList = (value: unknown) => (Array.isArray(value) ? value.filter((x): x is string => snowflake(x) !== null).slice(0, 25) : []);

function objects(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null).slice(0, 25) : [];
}

/** Saves a server's chat level settings and level roles. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveGuildChatLevelsAction(guildId: string, input: unknown): Promise<WelcomeActionResult<ChatLevelSettings>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;

  const result = await adminApi.saveChatLevels(guild, {
    enabled: p.enabled === true,
    minXp: Math.trunc(num(p.minXp, 15)),
    maxXp: Math.trunc(num(p.maxXp, 25)),
    cooldownSeconds: Math.trunc(num(p.cooldownSeconds, 60)),
    announce: p.announce === true,
    announceChannelId: snowflake(p.announceChannelId),
    announceMessage: typeof p.announceMessage === "string" ? p.announceMessage.slice(0, 300) : "",
    removeOldRoles: p.removeOldRoles === true,
    ignoredChannels: idList(p.ignoredChannels),
    ignoredRoles: idList(p.ignoredRoles),
    channelMultipliers: objects(p.channelMultipliers).map((r) => ({ channelId: snowflake(r.channelId) ?? "", multiplier: num(r.multiplier, 1) })),
    roleMultipliers: objects(p.roleMultipliers).map((r) => ({ roleId: snowflake(r.roleId) ?? "", multiplier: num(r.multiplier, 1) })),
    levelRoles: objects(p.levelRoles).map((r) => ({ level: Math.trunc(num(r.level, 0)), roleId: snowflake(r.roleId) ?? "" })),
  });
  revalidatePath(`/dashboard/${guildId}/chat-levels`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

/** Sets one member's XP (or everyone's) back to nothing. */
export async function resetGuildChatLevelsAction(guildId: string, target: { userId?: string; all?: boolean }): Promise<WelcomeActionResult<ChatLevelTop>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const userId = snowflake(target?.userId);
  const result = await adminApi.resetChatLevels(guild, userId ? { userId } : { all: target?.all === true });
  revalidatePath(`/dashboard/${guildId}/chat-levels`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
