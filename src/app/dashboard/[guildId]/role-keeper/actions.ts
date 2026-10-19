"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type RoleKeeper } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Server Actions for kept roles (sticky roles, roles kept on a member, timed roles). Each begins with `requireGuild(guildId)`; the bot then insists on an
 * Admin and refuses the clan role sync's roles and the staff permission roles. Adding a kept or timed role also gives the role to that member now: that is
 * the one real role change here, and it is one admin pressing one button for one named member.
 */
export type KeeperResult = { ok: true; data: RoleKeeper } | { ok: false; error: string; problems: string[] };

function outcome(result: ApiResult<RoleKeeper>): KeeperResult {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

const id = (v: unknown) => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);

async function guarded(guildId: string) {
  const guild = await requireGuild(guildId);
  return { guild, slow: throttle(guild.actorId, "admin") };
}

export async function saveStickyAction(guildId: string, roleIds: unknown): Promise<KeeperResult> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  const ids = (Array.isArray(roleIds) ? roleIds : []).map(id).filter((x): x is string => x !== null).slice(0, 30);
  const result = await adminApi.saveStickyRoles(guild, ids);
  revalidatePath(`/dashboard/${guildId}/role-keeper`);
  return outcome(result);
}

export async function addKeptAction(guildId: string, userId: string, roleId: string): Promise<KeeperResult> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  const user = id(userId);
  const role = id(roleId);
  if (!user || !role) return { ok: false, error: "Enter the member's Discord ID and choose a role.", problems: [] };
  const result = await adminApi.addKeptRole(guild, user, role);
  revalidatePath(`/dashboard/${guildId}/role-keeper`);
  return outcome(result);
}

export async function removeKeptAction(guildId: string, entryId: string): Promise<KeeperResult> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!id(entryId)) return { ok: false, error: "That entry is gone.", problems: [] };
  const result = await adminApi.removeKeptRole(guild, entryId);
  revalidatePath(`/dashboard/${guildId}/role-keeper`);
  return outcome(result);
}

export async function addTempAction(guildId: string, userId: string, roleId: string, duration: string): Promise<KeeperResult> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  const user = id(userId);
  const role = id(roleId);
  if (!user || !role) return { ok: false, error: "Enter the member's Discord ID and choose a role.", problems: [] };
  const result = await adminApi.addTempRole(guild, user, role, typeof duration === "string" ? duration.slice(0, 20) : "");
  revalidatePath(`/dashboard/${guildId}/role-keeper`);
  return outcome(result);
}

export async function endTempAction(guildId: string, tempId: string): Promise<KeeperResult> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!id(tempId)) return { ok: false, error: "That timed role is gone.", problems: [] };
  const result = await adminApi.endTempRole(guild, tempId);
  revalidatePath(`/dashboard/${guildId}/role-keeper`);
  return outcome(result);
}
