"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type LookupSettings, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Saves a server's RuneScape timer reminders. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveLookupRemindersAction(guildId: string, input: unknown): Promise<WelcomeActionResult<LookupSettings>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const list = typeof input === "object" && input !== null ? (input as Record<string, unknown>).reminders : null;
  if (!Array.isArray(list)) return { ok: false, error: "Those reminders couldn't be read.", problems: [] };

  const id = (v: unknown) => (typeof v === "string" && /^\d+$/.test(v) ? v : null);
  const reminders = list.slice(0, 20).flatMap((r) => {
    if (typeof r !== "object" || r === null) return [];
    const p = r as Record<string, unknown>;
    if (typeof p.kind !== "string") return [];
    return [{ kind: p.kind.slice(0, 40), enabled: p.enabled === true, channelId: id(p.channelId), roleId: id(p.roleId) }];
  });

  const result = await adminApi.saveLookups(guild, { reminders });
  revalidatePath(`/dashboard/${guildId}/rs-timers`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
