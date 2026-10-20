"use server";

import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type RoleFixPlan, type RoleFixStatus } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Server Actions for the clan role fix. Each begins with `requireGuild(guildId)`; the bot then insists on an Admin. Making the list changes nobody; only
 * `applyRoleFixAction`, called by the Apply button with the people a person ticked, changes roles, and the bot works out a fresh list and only changes
 * the ticked people who are still on it.
 */
export type FixResult<T> = { ok: true; data: T } | { ok: false; error: string; problems: string[] };

function outcome<T>(result: ApiResult<T>): FixResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

export async function planRoleFixAction(guildId: string): Promise<FixResult<RoleFixPlan>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  return outcome(await adminApi.roleFixPlan(guild));
}

export async function applyRoleFixAction(guildId: string, userIds: unknown): Promise<FixResult<RoleFixStatus>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const ids = (Array.isArray(userIds) ? userIds : []).filter((x): x is string => typeof x === "string" && /^\d{1,20}$/.test(x)).slice(0, 150);
  if (ids.length === 0) return { ok: false, error: "Tick at least one person.", problems: [] };
  return outcome(await adminApi.roleFixApply(guild, ids));
}

export async function roleFixStatusAction(guildId: string): Promise<FixResult<RoleFixStatus>> {
  const guild = await requireGuild(guildId);
  return outcome(await adminApi.roleFixStatus(guild));
}
