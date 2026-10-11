"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import {
  adminApi,
  type Autopunish,
  type AutopunishRule,
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

/** Saves the server's autopunish rules. */
export async function saveAutopunishAction(
  guildId: string,
  input: unknown,
): Promise<WelcomeActionResult<Autopunish>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!Array.isArray(input))
    return { ok: false, error: "Those rules couldn't be read.", problems: [] };
  const rules: AutopunishRule[] = [];
  for (const item of input.slice(0, 20)) {
    if (typeof item !== "object" || item === null) continue;
    const p = item as Record<string, unknown>;
    const action =
      p.action === "KICK" || p.action === "BAN" ? p.action : "TIMEOUT";
    rules.push({
      threshold:
        typeof p.threshold === "number" ? Math.trunc(p.threshold) : 0,
      action,
      timeoutMinutes:
        typeof p.timeoutMinutes === "number" ? Math.trunc(p.timeoutMinutes) : 0,
    });
  }
  const result = await adminApi.saveAutopunish(guild, rules);
  revalidatePath(`/dashboard/${guildId}/warnings`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}
