"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type MessageLogSettings, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const snowflake = (value: unknown) => (typeof value === "string" && /^\d+$/.test(value) ? value : null);

/** Saves a server's message and voice log settings. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveGuildMessageLogsAction(guildId: string, input: unknown): Promise<WelcomeActionResult<MessageLogSettings>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;

  const result = await adminApi.saveMessageLogs(guild, {
    enabled: p.enabled === true,
    retentionDays: typeof p.retentionDays === "number" && Number.isFinite(p.retentionDays) ? Math.trunc(p.retentionDays) : 7,
    excludedChannels: Array.isArray(p.excludedChannels) ? p.excludedChannels.filter((x): x is string => snowflake(x) !== null).slice(0, 50) : [],
    editChannelId: snowflake(p.editChannelId),
    deleteChannelId: snowflake(p.deleteChannelId),
    voiceChannelId: snowflake(p.voiceChannelId),
  });
  revalidatePath(`/dashboard/${guildId}/message-logs`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

/** Removes every remembered message of this server right away. */
export async function clearGuildMessageLogsAction(guildId: string): Promise<WelcomeActionResult<MessageLogSettings>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const result = await adminApi.clearMessageLogs(guild);
  revalidatePath(`/dashboard/${guildId}/message-logs`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
