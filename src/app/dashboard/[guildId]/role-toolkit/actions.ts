"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type RoleBulkJob, type RoleToolkit } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Server Actions for the role toolkit. Each begins with `requireGuild(guildId)`; the bot then insists on an Admin (a Developer login is refused) and
 * re-checks every role. A bulk job is planned (a dry run, nothing changes) by one action and started by another, so applying is always a deliberate press.
 */
export type ToolkitResult<T> = { ok: true; data: T } | { ok: false; error: string; problems: string[] };

function outcome<T>(result: ApiResult<T>): ToolkitResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

const id = (v: unknown) => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);

async function guarded(guildId: string) {
  const guild = await requireGuild(guildId);
  return { guild, slow: throttle(guild.actorId, "admin") };
}

export async function saveRoleAllowAction(guildId: string, groupKey: string, roleIds: unknown): Promise<ToolkitResult<RoleToolkit>> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^[a-z0-9-]{1,40}$/.test(groupKey)) return { ok: false, error: "That permission group does not exist.", problems: [] };
  const ids = (Array.isArray(roleIds) ? roleIds : []).map(id).filter((x): x is string => x !== null).slice(0, 100);
  const result = await adminApi.saveRoleAllow(guild, groupKey, ids);
  revalidatePath(`/dashboard/${guildId}/role-toolkit`);
  return outcome(result);
}

export async function planRoleBulkAction(guildId: string, input: unknown): Promise<ToolkitResult<RoleBulkJob>> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  const p = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const source = id(p.sourceRoleId);
  const target = id(p.targetRoleId);
  if (!source || !target) return { ok: false, error: "Choose both roles.", problems: [] };
  return outcome(await adminApi.planRoleBulk(guild, { mode: p.mode === "REMOVE" ? "REMOVE" : "ADD", sourceRoleId: source, targetRoleId: target }));
}

export async function roleBulkAction(guildId: string, jobId: string, action: string): Promise<ToolkitResult<RoleBulkJob>> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!id(jobId)) return { ok: false, error: "That job does not exist.", problems: [] };
  if (action !== "start" && action !== "pause" && action !== "cancel") return { ok: false, error: "That is not something a job can do.", problems: [] };
  const result = await adminApi.roleBulkAct(guild, jobId, action);
  revalidatePath(`/dashboard/${guildId}/role-toolkit`);
  return outcome(result);
}

export async function roleBulkStatusAction(guildId: string, jobId: string): Promise<ToolkitResult<RoleBulkJob>> {
  const guild = await requireGuild(guildId);
  if (!id(jobId)) return { ok: false, error: "That job does not exist.", problems: [] };
  return outcome(await adminApi.roleBulkJob(guild, jobId));
}
