"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type Starboard, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Saves a server's starboard. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveGuildStarboardAction(guildId: string, input: unknown): Promise<WelcomeActionResult<Starboard>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That starboard couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;

  const result = await adminApi.saveStarboard(guild, {
    enabled: p.enabled === true,
    channelId: typeof p.channelId === "string" && /^\d+$/.test(p.channelId) ? p.channelId : null,
    emoji: typeof p.emoji === "string" ? p.emoji.slice(0, 64) : "",
    threshold: typeof p.threshold === "number" && Number.isFinite(p.threshold) ? Math.trunc(p.threshold) : 3,
    selfStar: p.selfStar === true,
  });
  revalidatePath(`/dashboard/${guildId}/starboard`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
