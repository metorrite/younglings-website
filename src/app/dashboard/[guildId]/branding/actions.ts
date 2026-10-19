"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type BotBranding, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Saves how JonnyBot appears in a server. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveGuildBrandingAction(guildId: string, input: unknown): Promise<WelcomeActionResult<BotBranding>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;

  const result = await adminApi.saveBranding(guild, {
    displayName: typeof p.displayName === "string" ? p.displayName.slice(0, 80) : null,
    nickname: typeof p.nickname === "string" ? p.nickname.slice(0, 80) : null,
  });
  revalidatePath(`/dashboard/${guildId}/branding`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
