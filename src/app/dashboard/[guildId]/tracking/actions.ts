"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Saves where one kind of clan event is announced in one server. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveGuildTrackingAction(
  guildId: string,
  key: string,
  enabled: boolean,
  channelIds: string[],
): Promise<{ ok: true; data: undefined } | { ok: false; error: string }> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!/^[A-Z_]+$/.test(key)) return { ok: false, error: "That isn't a tracking group." };

  const result = await adminApi.saveTracking(guild, key, {
    enabled: enabled === true,
    channelIds: (Array.isArray(channelIds) ? channelIds : []).filter((c) => /^\d+$/.test(c)),
  });
  revalidatePath(`/dashboard/${guildId}/tracking`);
  return result.ok ? { ok: true, data: undefined } : { ok: false, error: result.problems[0] ?? result.error };
}
