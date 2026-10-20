"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type EventAnnouncer, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Saves a server's scheduled event announcer. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveEventAnnouncerAction(guildId: string, input: unknown): Promise<WelcomeActionResult<EventAnnouncer>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  const result = await adminApi.saveEventAnnouncer(guild, {
    enabled: p.enabled === true,
    channelId: typeof p.channelId === "string" && /^\d{1,20}$/.test(p.channelId) ? p.channelId : null,
    useRole: p.useRole === true,
    notifyStart: p.notifyStart !== false,
  });
  revalidatePath(`/dashboard/${guildId}/event-announcer`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
