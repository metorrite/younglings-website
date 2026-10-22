"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type AppealsView, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const id = (v: unknown) => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);

/** Saves the appeal settings (T-033). The bot checks the panel and channel belong to this server. */
export async function saveAppealSettingsAction(guildId: string, input: unknown): Promise<WelcomeActionResult<AppealsView>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  const days = typeof p.cooldownDays === "number" && Number.isFinite(p.cooldownDays) ? Math.floor(p.cooldownDays) : 7;
  const result = await adminApi.saveAppealSettings(guild, { enabled: p.enabled === true, panelId: id(p.panelId), cooldownDays: days, mirrorChannelId: id(p.mirrorChannelId) });
  revalidatePath(`/dashboard/${guildId}/appeals`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

/** Approves (lifts the ban or timeout as you) or turns down an appeal. The bot checks you have the permission for it. */
export async function decideAppealAction(guildId: string, appealId: string, approve: boolean, note: string): Promise<WelcomeActionResult<AppealsView>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!id(appealId) || typeof note !== "string") return { ok: false, error: "That appeal couldn't be read.", problems: [] };
  const result = await adminApi.decideAppeal(guild, appealId, approve === true, note.slice(0, 500));
  revalidatePath(`/dashboard/${guildId}/appeals`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
