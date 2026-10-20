"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ServerReminderList, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

type Result = WelcomeActionResult<ServerReminderList>;
const fail = (error: string): Result => ({ ok: false, error, problems: [] });

async function guard(guildId: string) {
  const guild = await requireGuild(guildId);
  return { guild, slow: throttle(guild.actorId, "admin") };
}

/** Creates a channel reminder. Like every dashboard action it checks the user against *that* server first; the bot checks the rest. */
export async function createServerReminderAction(guildId: string, input: unknown): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (typeof input !== "object" || input === null) return fail("That reminder couldn't be read.");
  const p = input as Record<string, unknown>;
  if (typeof p.channelId !== "string" || !/^\d{1,20}$/.test(p.channelId)) return fail("Choose a channel.");
  if (typeof p.startAt !== "string" || Number.isNaN(Date.parse(p.startAt))) return fail("Choose when the first post should be.");
  const result = await adminApi.createServerReminder(guild, {
    channelId: p.channelId,
    text: typeof p.text === "string" ? p.text.slice(0, 1200) : "",
    roleId: typeof p.roleId === "string" && /^\d{1,20}$/.test(p.roleId) ? p.roleId : null,
    startAt: new Date(p.startAt).toISOString(),
    everyMinutes: typeof p.everyMinutes === "number" && Number.isFinite(p.everyMinutes) && p.everyMinutes > 0 ? Math.trunc(p.everyMinutes) : null,
  });
  revalidatePath(`/dashboard/${guildId}/server-reminders`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

export async function cancelServerReminderAction(guildId: string, id: string): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (!/^\d{1,18}$/.test(id)) return fail("That isn't a valid reminder.");
  const result = await adminApi.cancelServerReminder(guild, id);
  revalidatePath(`/dashboard/${guildId}/server-reminders`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
