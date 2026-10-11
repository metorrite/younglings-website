"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import {
  adminApi,
  type WarningList,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Takes one warning back. Giving warnings is done with /warn in Discord, where the role hierarchy can be checked. */
export async function deleteWarningAction(
  guildId: string,
  id: string,
): Promise<WelcomeActionResult<WarningList>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d+$/.test(id))
    return { ok: false, error: "That isn't a valid warning.", problems: [] };
  const result = await adminApi.deleteWarning(guild, id);
  revalidatePath(`/dashboard/${guildId}/warnings`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}
