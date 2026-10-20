"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type VoiceText, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const id = (v: unknown): string | null => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);

/** Saves a server's voice-text pairs and switches. Like every dashboard action it checks the signed-in user against *that* server; the bot checks every channel. */
export async function saveVoiceTextAction(guildId: string, input: unknown): Promise<WelcomeActionResult<VoiceText>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  const links = Array.isArray(p.links)
    ? p.links
        .map((l) => (typeof l === "object" && l !== null ? { voiceChannelId: id((l as Record<string, unknown>).voiceChannelId), textChannelId: id((l as Record<string, unknown>).textChannelId) } : null))
        .filter((l): l is { voiceChannelId: string; textChannelId: string } => l !== null && l.voiceChannelId !== null && l.textChannelId !== null)
        .slice(0, 30)
    : [];
  const result = await adminApi.saveVoiceText(guild, { enabled: p.enabled === true, announce: p.announce === true, purgeWhenEmpty: p.purgeWhenEmpty === true, links });
  revalidatePath(`/dashboard/${guildId}/voice-text`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
