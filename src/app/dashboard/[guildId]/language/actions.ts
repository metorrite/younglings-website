"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type LanguageConfig, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Saves the language JonnyBot uses in a server. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveLanguageAction(guildId: string, language: unknown): Promise<WelcomeActionResult<LanguageConfig>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof language !== "string" || language.length === 0 || language.length > 16) return { ok: false, error: "That couldn't be read.", problems: [] };

  const result = await adminApi.saveLanguage(guild, language);
  revalidatePath(`/dashboard/${guildId}/language`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
