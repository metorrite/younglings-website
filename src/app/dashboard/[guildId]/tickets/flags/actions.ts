"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type TicketFlagList, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Server Actions for the ticket flags. Each starts by running `requireGuild`, so a forged server id gets a 404; the bot checks the ticket belongs to the server. */

function outcome<T>(result: ApiResult<T>): WelcomeActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

const fail = (error: string): { ok: false; error: string; problems: string[] } => ({ ok: false, error, problems: [] });
const isId = (v: unknown): v is string => typeof v === "string" && /^\d{1,20}$/.test(v);

export async function setTicketFlagsEnabledAction(guildId: string, enabled: boolean): Promise<WelcomeActionResult<TicketFlagList>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  const result = await adminApi.setTicketFlagsEnabled(guild, enabled === true);
  revalidatePath(`/dashboard/${guildId}/tickets/flags`);
  return outcome(result);
}

export async function addTicketFlagAction(guildId: string, ticketId: string, note: string): Promise<WelcomeActionResult<TicketFlagList>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (!isId(ticketId) || typeof note !== "string") return fail("That flag couldn't be read.");
  const result = await adminApi.addTicketFlag(guild, ticketId, note.slice(0, 1000));
  revalidatePath(`/dashboard/${guildId}/tickets/flags`);
  return outcome(result);
}

export async function deleteTicketFlagAction(guildId: string, flagId: string): Promise<WelcomeActionResult<{ deleted: boolean }>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (!isId(flagId)) return fail("That flag doesn't exist.");
  const result = await adminApi.deleteTicketFlag(guild, flagId);
  revalidatePath(`/dashboard/${guildId}/tickets/flags`);
  return outcome(result);
}
