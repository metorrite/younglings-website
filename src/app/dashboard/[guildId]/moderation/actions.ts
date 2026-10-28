"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ModerationCase, type ModerationOverview, type ModerationSettings, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Saves the moderation settings. Nothing here bans or kicks anyone: those are slash commands, which check the moderator's own role. */
export async function saveModerationSettingsAction(guildId: string, input: unknown): Promise<WelcomeActionResult<ModerationOverview>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  const settings: ModerationSettings = {
    dmReason: p.dmReason !== false,
    showModerator: p.showModerator === true,
    appealUrl: typeof p.appealUrl === "string" && p.appealUrl.trim() ? p.appealUrl.trim().slice(0, 200) : null,
    protectedRoleIds: Array.isArray(p.protectedRoleIds) ? p.protectedRoleIds.filter((id): id is string => typeof id === "string" && /^\d{1,20}$/.test(id)).slice(0, 25) : [],
  };
  const result = await adminApi.saveModerationSettings(guild, settings);
  revalidatePath(`/dashboard/${guildId}/moderation`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

/** Changes a case's reason (the first one is kept in the case history). */
export async function editCaseReasonAction(guildId: string, caseNo: string, reason: string): Promise<WelcomeActionResult<ModerationCase>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d{1,19}$/.test(caseNo) || typeof reason !== "string") return { ok: false, error: "That isn't a valid case.", problems: [] };
  const result = await adminApi.editModerationCase(guild, caseNo, reason.slice(0, 600));
  revalidatePath(`/dashboard/${guildId}/moderation`);
  return result.ok ? { ok: true, data: result.data.case } : { ok: false, error: result.error, problems: result.problems };
}

/** Every case for one member (`by: "user"`) or by one moderator (`by: "moderator"`), looked up by Discord id. */
export async function lookUpCasesAction(guildId: string, by: "user" | "moderator", id: string): Promise<WelcomeActionResult<ModerationCase[]>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d{1,19}$/.test(id)) return { ok: false, error: "That isn't a Discord id.", problems: [] };
  const result = by === "user" ? await adminApi.moderationOfUser(guild, id) : await adminApi.moderationByModerator(guild, id);
  return result.ok ? { ok: true, data: result.data.cases } : { ok: false, error: result.error, problems: result.problems };
}
