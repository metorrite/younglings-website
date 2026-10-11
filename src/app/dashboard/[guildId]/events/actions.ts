"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ClanEvents, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Chooses who may see one of this server's Discord events: nobody outside the server, allied clans only, or everyone in the directory. */
export async function setEventScopeAction(guildId: string, id: string, scope: string): Promise<WelcomeActionResult<ClanEvents>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d+$/.test(id)) return { ok: false, error: "That isn't a valid event.", problems: [] };
  if (scope !== "NONE" && scope !== "ALLIANCE" && scope !== "PUBLIC") return { ok: false, error: "Choose who may see the event.", problems: [] };
  const result = await adminApi.setClanEventScope(guild, id, scope);
  revalidatePath(`/dashboard/${guildId}/events`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
