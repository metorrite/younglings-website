"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ClanEvents, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Shows or hides one of this server's Discord events in the public directory. */
export async function setEventSharedAction(guildId: string, id: string, shared: boolean): Promise<WelcomeActionResult<ClanEvents>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d+$/.test(id)) return { ok: false, error: "That isn't a valid event.", problems: [] };
  const result = await adminApi.setClanEventShared(guild, id, shared === true);
  revalidatePath(`/dashboard/${guildId}/events`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
