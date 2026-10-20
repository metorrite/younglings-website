"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type Lockdown, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Server Actions for one server's lockdown page. Like every dashboard action each starts with `requireGuild`, which asks the bot whether this signed-in user may
 * use the dashboard for *that* server; the bot then refuses anyone below the Admin tier, since this changes who can talk in channels.
 */
type Result = WelcomeActionResult<Lockdown>;

const id = (v: unknown): string | null => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);
const ids = (v: unknown): string[] => (Array.isArray(v) ? v.map(id).filter((x): x is string => x !== null).slice(0, 60) : []);
const text = (v: unknown): string => (typeof v === "string" ? v.slice(0, 200) : "");

async function run(guildId: string, work: (guild: Awaited<ReturnType<typeof requireGuild>>) => ReturnType<typeof adminApi.lockdown>): Promise<Result> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const result = await work(guild);
  revalidatePath(`/dashboard/${guildId}/lockdown`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

export async function saveLockdownSetAction(guildId: string, input: unknown): Promise<Result> {
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  return run(guildId, (g) => adminApi.saveLockdown(g, { channelIds: ids(p.channelIds), keepTalkingRoleIds: ids(p.keepTalkingRoleIds) }));
}

export async function lockChannelAction(guildId: string, channelId: string, reason: string): Promise<Result> {
  const channel = id(channelId);
  if (!channel) return { ok: false, error: "Choose a channel.", problems: [] };
  return run(guildId, (g) => adminApi.lockChannel(g, { channelId: channel, reason: text(reason) }));
}

export async function unlockChannelAction(guildId: string, channelId: string): Promise<Result> {
  const channel = id(channelId);
  if (!channel) return { ok: false, error: "Choose a channel.", problems: [] };
  return run(guildId, (g) => adminApi.unlockChannel(g, { channelId: channel }));
}

export async function startLockdownAction(guildId: string, reason: string): Promise<Result> {
  return run(guildId, (g) => adminApi.startLockdown(g, { reason: text(reason) }));
}

export async function endLockdownAction(guildId: string): Promise<Result> {
  return run(guildId, (g) => adminApi.endLockdown(g));
}
