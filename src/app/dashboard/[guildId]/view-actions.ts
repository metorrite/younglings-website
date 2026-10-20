"use server";

import { requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Saves the Basic/Advanced view this person chose in this server, so it follows them to another computer. Like every dashboard action it starts
 * with `requireGuild`, and the bot keeps it per admin, so nobody can change anyone else's. The browser still decides at once (localStorage); this
 * only makes the choice outlast the browser. A failure is harmless and returns false.
 */
export async function setViewModeAction(guildId: string, mode: unknown): Promise<boolean> {
  const guild = await requireGuild(guildId);
  if (throttle(guild.actorId, "admin")) return false;
  if (mode !== "basic" && mode !== "advanced") return false;
  const result = await adminApi.saveViewMode(guild, mode);
  return result.ok;
}
