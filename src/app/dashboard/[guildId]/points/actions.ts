"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import {
  adminApi,
  type PointsOverview,
  type PointsRedemptions,
  type PointsRewards,
  type PointsSubmissions,
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
    reviewChannelId: typeof p.reviewChannelId === "string" && /^\d{1,20}$/.test(p.reviewChannelId) ? p.reviewChannelId : null,
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

/** Approves a waiting submission and pays the amount staff chose, or denies it with a reason the member is told. */
export async function decideSubmissionAction(
  guildId: string,
  id: string,
  input: unknown,
): Promise<WelcomeActionResult<PointsSubmissions>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d{1,18}$/.test(id))
    return { ok: false, error: "That isn't a valid submission.", problems: [] };
  if (typeof input !== "object" || input === null)
    return { ok: false, error: "That decision couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  const approve = p.approve === true;
  const result = await adminApi.decidePointsSubmission(guild, id, approve, {
    points: approve && typeof p.points === "number" ? Math.trunc(p.points) : undefined,
    note: typeof p.note === "string" ? p.note.slice(0, 300) : "",
  });
  revalidatePath(`/dashboard/${guildId}/points`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}

/** Adds a reward, or changes one (including archiving it with `active: false`). */
export async function saveRewardAction(
  guildId: string,
  id: string | null,
  input: unknown,
): Promise<WelcomeActionResult<PointsRewards>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (id !== null && !/^\d{1,18}$/.test(id))
    return { ok: false, error: "That isn't a valid reward.", problems: [] };
  if (typeof input !== "object" || input === null)
    return { ok: false, error: "That reward couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  const result = await adminApi.savePointsReward(guild, id, {
    name: typeof p.name === "string" ? p.name.slice(0, 100) : "",
    description: typeof p.description === "string" ? p.description.slice(0, 300) : "",
    cost: typeof p.cost === "number" ? Math.trunc(p.cost) : 0,
    stock: typeof p.stock === "number" ? Math.trunc(p.stock) : null,
    active: p.active !== false,
  });
  revalidatePath(`/dashboard/${guildId}/points`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}

/** Marks a redemption handed over, or cancels it (which refunds the member). */
export async function handleRedemptionAction(
  guildId: string,
  id: string,
  fulfil: boolean,
): Promise<WelcomeActionResult<PointsRedemptions>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d{1,18}$/.test(id))
    return { ok: false, error: "That isn't a valid redemption.", problems: [] };
  const result = await adminApi.handlePointsRedemption(guild, id, fulfil === true);
  revalidatePath(`/dashboard/${guildId}/points`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}
