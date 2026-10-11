"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/admin/(console)/actions";
import { requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Saves the channel member polls are posted in for one server (empty: member polls are off). */
export async function saveGuildCommunityAction(guildId: string, pollChannelId: string | null): Promise<ActionResult<undefined>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow };

  const result = await adminApi.saveCommunity(guild, pollChannelId && /^\d+$/.test(pollChannelId) ? pollChannelId : null);
  revalidatePath(`/dashboard/${guildId}/community`);
  return result.ok ? { ok: true, data: undefined } : { ok: false, error: result.problems[0] ?? result.error };
}
