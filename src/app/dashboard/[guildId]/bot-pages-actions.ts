"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/admin/(console)/actions";
import type { HelpActionResult } from "@/app/admin/(console)/pvm-help/actions";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type ClanPoints, type HelpSettings, type PromotionDue, type SelfRoleConfig } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Server Actions for the pages that used to live only on /admin (promotions, clan points and ranks, PvM Help, self roles, the clan website link).
 * Each begins with `requireGuild(guildId)`: a Server Action can be POSTed directly, so the page's own check is not enough, and the acting user and the
 * server both come from the verified session and the bot's answer, never from what the browser sends.
 */

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const wholeNumber = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : 0);
const idOrNull = (v: unknown): string | null => (typeof v === "string" && /^\d+$/.test(v) ? v : null);
const hoursOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null);

function outcome<T>(result: ApiResult<T>): ActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.problems[0] ?? result.error };
}

function helpOutcome<T>(result: ApiResult<T>): HelpActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

export async function markGuildPromotedAction(guildId: string, rsn: string): Promise<ActionResult<PromotionDue[]>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!rsn || rsn.length > 40) return { ok: false, error: "That isn't a valid name." };
  const result = await adminApi.markPromoted(guild, rsn);
  revalidatePath(`/dashboard/${guildId}/promotions`);
  return result.ok ? { ok: true, data: result.data.members } : { ok: false, error: result.error };
}

export async function saveGuildClanPointsAction(guildId: string, input: unknown): Promise<ActionResult<ClanPoints>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read." };
  const s = input as Record<string, unknown>;
  const ranks = (Array.isArray(s.ranks) ? s.ranks : [])
    .map((raw) => (raw ?? {}) as Record<string, unknown>)
    .filter((r) => typeof r.id === "string" && /^\d+$/.test(r.id))
    .map((r) => ({ id: r.id as string, threshold: wholeNumber(r.threshold) }));
  const result = await adminApi.saveClanPoints(guild, {
    dailyMembershipPoints: wholeNumber(s.dailyMembershipPoints),
    citadelVisitPoints: wholeNumber(s.citadelVisitPoints),
    citadelCapPoints: wholeNumber(s.citadelCapPoints),
    ranks,
  });
  revalidatePath(`/dashboard/${guildId}/clan-points`);
  return outcome(result);
}

export async function saveGuildSelfRolesAction(guildId: string, input: unknown): Promise<ActionResult<SelfRoleConfig[]>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!Array.isArray(input)) return { ok: false, error: "Those roles couldn't be read." };
  const roles = input
    .map((raw) => (raw ?? {}) as Record<string, unknown>)
    .filter((r) => typeof r.roleId === "string" && /^\d+$/.test(r.roleId))
    .map((r) => ({ roleId: r.roleId as string, label: text(r.label), description: text(r.description) }));
  const result = await adminApi.saveSelfRoles(guild, roles);
  revalidatePath(`/dashboard/${guildId}/self-roles`);
  revalidatePath("/profile");
  return result.ok ? { ok: true, data: result.data.roles } : { ok: false, error: result.problems[0] ?? result.error };
}

export async function saveGuildClanWebsiteAction(guildId: string, websiteUrl: string): Promise<ActionResult<{ websiteUrl: string | null }>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  const value = text(websiteUrl).trim().slice(0, 300);
  const result = await adminApi.saveClanWebsite(guild, value === "" ? null : value);
  if (result.ok) revalidatePath(`/dashboard/${guildId}/clan-website`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.problems[0] ?? result.error };
}

export async function saveGuildHelpSettingsAction(guildId: string, input: unknown): Promise<HelpActionResult<HelpSettings>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const s = input as Record<string, unknown>;
  const result = await adminApi.saveHelpSettings(guild, {
    helperRoleId: idOrNull(s.helperRoleId),
    helperPlusRoleId: idOrNull(s.helperPlusRoleId),
    guidelines: text(s.guidelines),
    memberPingOnOpen: s.memberPingOnOpen !== false,
    memberEscalationHours: hoursOrNull(s.memberEscalationHours),
    guestPingsEnabled: s.guestPingsEnabled === true,
    guestPingOnOpen: s.guestPingOnOpen !== false,
    guestEscalationHours: hoursOrNull(s.guestEscalationHours),
    guestHighTierNeedsAttempts: s.guestHighTierNeedsAttempts !== false,
    highTierLabels: text(s.highTierLabels),
  });
  revalidatePath(`/dashboard/${guildId}/pvm-help`);
  return helpOutcome(result);
}

export async function createGuildHelpPanelsAction(guildId: string): Promise<HelpActionResult<HelpSettings>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const result = await adminApi.createHelpPanels(guild);
  revalidatePath(`/dashboard/${guildId}/pvm-help`);
  revalidatePath(`/dashboard/${guildId}/tickets`);
  return helpOutcome(result);
}

export async function postGuildHelpGuidelinesAction(guildId: string, channelId: string): Promise<HelpActionResult<HelpSettings>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d+$/.test(channelId)) return { ok: false, error: "Choose a channel to post in.", problems: [] };
  const result = await adminApi.postHelpGuidelines(guild, channelId);
  revalidatePath(`/dashboard/${guildId}/pvm-help`);
  return helpOutcome(result);
}
