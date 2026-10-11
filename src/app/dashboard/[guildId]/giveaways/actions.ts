"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import {
  adminApi,
  type GiveawayList,
  type GiveawayStart,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

type Result = WelcomeActionResult<GiveawayList>;
const fail = (error: string): Result => ({ ok: false, error, problems: [] });

async function guard(guildId: string) {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  return { guild, slow };
}

/** Starts a giveaway. Like every dashboard action it checks the user against *that* server first. */
export async function startGuildGiveawayAction(
  guildId: string,
  input: unknown,
): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (typeof input !== "object" || input === null)
    return fail("That giveaway couldn't be read.");
  const p = input as Record<string, unknown>;
  const body: GiveawayStart = {
    prize: typeof p.prize === "string" ? p.prize.slice(0, 300) : "",
    channelId:
      typeof p.channelId === "string" && /^\d+$/.test(p.channelId)
        ? p.channelId
        : "",
    durationMinutes:
      typeof p.durationMinutes === "number" &&
      Number.isFinite(p.durationMinutes)
        ? Math.trunc(p.durationMinutes)
        : 0,
    winners:
      typeof p.winners === "number" && Number.isFinite(p.winners)
        ? Math.trunc(p.winners)
        : 1,
    requiredRoleId:
      typeof p.requiredRoleId === "string" && /^\d+$/.test(p.requiredRoleId)
        ? p.requiredRoleId
        : null,
  };
  const result = await adminApi.startGiveaway(guild, body);
  revalidatePath(`/dashboard/${guildId}/giveaways`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}

async function onGiveaway(
  guildId: string,
  id: string,
  run: (
    guild: Awaited<ReturnType<typeof requireGuild>>,
  ) => ReturnType<typeof adminApi.endGiveaway>,
): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (!/^\d+$/.test(id)) return fail("That isn't a valid giveaway.");
  const result = await run(guild);
  revalidatePath(`/dashboard/${guildId}/giveaways`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}

export const endGuildGiveawayAction = (guildId: string, id: string) =>
  onGiveaway(guildId, id, (g) => adminApi.endGiveaway(g, id));
export const rerollGuildGiveawayAction = (guildId: string, id: string) =>
  onGiveaway(guildId, id, (g) => adminApi.rerollGiveaway(g, id));
export const deleteGuildGiveawayAction = (guildId: string, id: string) =>
  onGiveaway(guildId, id, (g) => adminApi.deleteGiveaway(g, id));
