"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import {
  adminApi,
  type PointsOverview,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Turns points on or off and sets what they are called. */
export async function savePointsSettingsAction(
  guildId: string,
  input: unknown,
): Promise<WelcomeActionResult<PointsOverview>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null)
    return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  const result = await adminApi.savePoints(guild, {
    enabled: p.enabled === true,
    unit: typeof p.unit === "string" ? p.unit.slice(0, 40) : "points",
  });
  revalidatePath(`/dashboard/${guildId}/points`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}

/** Gives a member points, or takes some back with a negative amount. The reason is kept in the history. */
export async function awardPointsAction(
  guildId: string,
  input: unknown,
): Promise<WelcomeActionResult<PointsOverview>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null)
    return { ok: false, error: "That award couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  const userId = typeof p.userId === "string" ? p.userId.trim() : "";
  if (!/^\d{5,20}$/.test(userId))
    return {
      ok: false,
      error: "Paste the member's Discord user ID (right-click them with Developer Mode on, then Copy User ID).",
      problems: [],
    };
  const points = typeof p.points === "number" ? Math.trunc(p.points) : 0;
  const result = await adminApi.awardPoints(guild, {
    userId,
    points,
    reason: typeof p.reason === "string" ? p.reason.slice(0, 300) : "",
  });
  revalidatePath(`/dashboard/${guildId}/points`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}
