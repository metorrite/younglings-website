"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type KickOfflineAction, type KickOverview } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Server Actions for Kick alerts. Each begins with `requireGuild(guildId)` (a Server Action can be POSTed directly), and the browser-supplied
 * values are rebuilt field by field before the bot validates them (the channel and role must belong to this server, the channel must exist on Kick).
 */
export type KickActionResult = { ok: true; data: KickOverview } | { ok: false; error: string; problems: string[] };

function outcome(result: ApiResult<KickOverview>): KickActionResult {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

const idOrNull = (v: unknown) => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const ACTIONS: KickOfflineAction[] = ["EDIT", "DELETE", "KEEP"];

async function guarded(guildId: string) {
  const guild = await requireGuild(guildId);
  return { guild, slow: throttle(guild.actorId, "admin") };
}

export async function saveKickSettingsAction(guildId: string, input: unknown): Promise<KickActionResult> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  const p = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const offlineAction = ACTIONS.find((a) => a === p.offlineAction) ?? "EDIT";
  const result = await adminApi.saveKickSettings(guild, { enabled: p.enabled === true, offlineAction });
  revalidatePath(`/dashboard/${guildId}/kick`);
  return outcome(result);
}

export async function addKickStreamerAction(guildId: string, input: unknown): Promise<KickActionResult> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  const p = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const channelId = idOrNull(p.channelId);
  if (!channelId) return { ok: false, error: "Choose the channel the alerts go to.", problems: [] };
  const result = await adminApi.addKickStreamer(guild, { login: text(p.login, 200), channelId, pingRoleId: idOrNull(p.pingRoleId), message: text(p.message, 400) });
  revalidatePath(`/dashboard/${guildId}/kick`);
  return outcome(result);
}

export async function saveKickStreamerAction(guildId: string, id: string, input: unknown): Promise<KickActionResult> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d{1,20}$/.test(id)) return { ok: false, error: "That streamer is not followed any more.", problems: [] };
  const p = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const channelId = idOrNull(p.channelId);
  if (!channelId) return { ok: false, error: "Choose the channel the alerts go to.", problems: [] };
  const result = await adminApi.saveKickStreamer(guild, id, { channelId, pingRoleId: idOrNull(p.pingRoleId), message: text(p.message, 400), enabled: p.enabled === true });
  revalidatePath(`/dashboard/${guildId}/kick`);
  return outcome(result);
}

export async function deleteKickStreamerAction(guildId: string, id: string): Promise<KickActionResult> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d{1,20}$/.test(id)) return { ok: false, error: "That streamer is not followed any more.", problems: [] };
  const result = await adminApi.deleteKickStreamer(guild, id);
  revalidatePath(`/dashboard/${guildId}/kick`);
  return outcome(result);
}
