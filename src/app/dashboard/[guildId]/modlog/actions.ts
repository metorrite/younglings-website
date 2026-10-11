"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import {
  adminApi,
  type ModLog,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Saves a server's moderation log. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveGuildModLogAction(
  guildId: string,
  input: unknown,
): Promise<WelcomeActionResult<ModLog>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null)
    return {
      ok: false,
      error: "Those settings couldn't be read.",
      problems: [],
    };
  const p = input as Record<string, unknown>;

  const result = await adminApi.saveModLog(guild, {
    enabled: p.enabled === true,
    channelId:
      typeof p.channelId === "string" && /^\d+$/.test(p.channelId)
        ? p.channelId
        : null,
    logBans: p.logBans !== false,
    logTimeouts: p.logTimeouts !== false,
  });
  revalidatePath(`/dashboard/${guildId}/modlog`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}
