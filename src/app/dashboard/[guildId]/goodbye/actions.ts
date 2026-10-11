"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type Goodbye, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Saves a server's goodbye message. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveGuildGoodbyeAction(guildId: string, input: unknown): Promise<WelcomeActionResult<Goodbye>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That message couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;

  const result = await adminApi.saveGoodbye(guild, {
    enabled: p.enabled === true,
    channelId: typeof p.channelId === "string" && /^\d+$/.test(p.channelId) ? p.channelId : null,
    content: typeof p.content === "string" ? p.content.slice(0, 1600) : "",
  });
  revalidatePath(`/dashboard/${guildId}/goodbye`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
