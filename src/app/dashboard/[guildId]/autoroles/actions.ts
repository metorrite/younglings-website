"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type Autoroles, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const roleIds = (v: unknown): string[] => (Array.isArray(v) ? v.filter((id): id is string => typeof id === "string" && /^\d+$/.test(id)).slice(0, 25) : []);

/** Saves a server's autoroles. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveGuildAutorolesAction(guildId: string, input: unknown): Promise<WelcomeActionResult<Autoroles>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;

  const result = await adminApi.saveAutoroles(guild, {
    enabled: p.enabled === true,
    delaySeconds: typeof p.delaySeconds === "number" && Number.isFinite(p.delaySeconds) ? Math.trunc(p.delaySeconds) : 0,
    memberRoleIds: roleIds(p.memberRoleIds),
    botRoleIds: roleIds(p.botRoleIds),
  });
  revalidatePath(`/dashboard/${guildId}/autoroles`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
