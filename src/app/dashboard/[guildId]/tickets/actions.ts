"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type HelpExtras, type PanelDefaults, type PanelDefinition, type TicketSettings } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";
import { cleanDefaults, cleanPanel, idOrNull, intOrNull } from "@/lib/ticketInput";

/**
 * The ticket Server Actions for the bot dashboard: the same as the clan console's, but each one checks the user against *this
 * server* first and sends the call to it. Input is rebuilt field by field (see lib/ticketInput); the bot validates the content.
 */

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; problems: string[] };

const outcome = <T>(result: ApiResult<T>): ActionResult<T> => (result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems });
const invalid = (error: string): ActionResult<never> => ({ ok: false, error, problems: [] });

export async function saveGuildPanelAction(guildId: string, panelId: string | null, input: unknown): Promise<ActionResult<PanelDefinition>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return invalid(slow);
  const panel = cleanPanel(input);
  if (!panel) return invalid("That panel couldn't be read.");
  if (panelId !== null && !/^\d+$/.test(panelId)) return invalid("That isn't a valid panel.");

  const result = panelId === null ? await adminApi.createPanel(guild, panel) : await adminApi.updatePanel(guild, panelId, panel);
  revalidatePath(`/dashboard/${guildId}/tickets`);
  return outcome(result);
}

export async function deleteGuildPanelAction(guildId: string, panelId: string): Promise<ActionResult> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return invalid(slow);
  if (!/^\d+$/.test(panelId)) return invalid("That isn't a valid panel.");

  const result = await adminApi.deletePanel(guild, panelId);
  revalidatePath(`/dashboard/${guildId}/tickets`);
  return result.ok ? { ok: true, data: undefined } : outcome(result);
}

export async function postGuildPanelAction(guildId: string, panelId: string, channelId: string): Promise<ActionResult<PanelDefinition>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return invalid(slow);
  if (!/^\d+$/.test(panelId) || !/^\d+$/.test(channelId)) return invalid("Choose a channel to post in.");

  const result = await adminApi.postPanel(guild, panelId, channelId);
  revalidatePath(`/dashboard/${guildId}/tickets`);
  return outcome(result);
}

export async function saveGuildTicketSettingsAction(guildId: string, input: unknown): Promise<ActionResult<TicketSettings>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return invalid(slow);
  if (typeof input !== "object" || input === null) return invalid("Those settings couldn't be read.");
  const s = input as Record<string, unknown>;

  const result = await adminApi.saveSettings(guild, {
    logChannelId: idOrNull(s.logChannelId),
    transcriptDm: s.transcriptDm !== false,
    closeDelaySeconds: intOrNull(s.closeDelaySeconds) ?? 10,
    transcriptRetentionDays: intOrNull(s.transcriptRetentionDays),
    autoCloseDays: intOrNull(s.autoCloseDays),
  });
  revalidatePath(`/dashboard/${guildId}/tickets/settings`);
  return outcome(result);
}

export async function saveGuildPanelDefaultsAction(guildId: string, input: unknown): Promise<ActionResult<PanelDefaults>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return invalid(slow);
  const defaults = cleanDefaults(input);
  if (!defaults) return invalid("Those defaults couldn't be read.");

  const result = await adminApi.savePanelDefaults(guild, defaults);
  revalidatePath(`/dashboard/${guildId}/tickets/defaults`);
  return outcome(result);
}

/** Saves the optional extras of the help tickets. The bot validates the numbers. */
export async function saveGuildHelpExtrasAction(guildId: string, input: unknown): Promise<ActionResult<HelpExtras>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return invalid(slow);
  if (typeof input !== "object" || input === null) return invalid("Those settings couldn't be read.");
  const s = input as Record<string, unknown>;

  const result = await adminApi.saveHelpExtras(guild, {
    eventButton: s.eventButton === true,
    eventStartHours: intOrNull(s.eventStartHours) ?? 24,
    eventDays: intOrNull(s.eventDays) ?? 1,
    relatedTickets: s.relatedTickets === true,
    groupBosses: typeof s.groupBosses === "string" ? s.groupBosses.slice(0, 400) : "",
  });
  revalidatePath(`/dashboard/${guildId}/tickets/help-extras`);
  return outcome(result);
}
