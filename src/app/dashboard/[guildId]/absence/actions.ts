"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type AbsenceAdmin, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Switches leave of absence on or off for a server. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveAbsenceAction(guildId: string, enabled: unknown): Promise<WelcomeActionResult<AbsenceAdmin>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const result = await adminApi.saveAbsence(guild, enabled === true);
  revalidatePath(`/dashboard/${guildId}/absence`);
  revalidatePath(`/dashboard/${guildId}/attention`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

/** Ends one member's leave early (they're back, or it was set by mistake). */
export async function endAbsenceAction(guildId: string, userId: unknown): Promise<WelcomeActionResult<AbsenceAdmin>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof userId !== "string" || !/^\d{1,20}$/.test(userId)) return { ok: false, error: "That isn't a member.", problems: [] };
  const result = await adminApi.endAbsence(guild, userId);
  revalidatePath(`/dashboard/${guildId}/absence`);
  revalidatePath(`/dashboard/${guildId}/attention`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
