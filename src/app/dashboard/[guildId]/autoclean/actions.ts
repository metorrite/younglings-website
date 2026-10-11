"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import {
  adminApi,
  type AutoCleanList,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

type Result = WelcomeActionResult<AutoCleanList>;
const fail = (error: string): Result => ({ ok: false, error, problems: [] });

async function guard(guildId: string) {
  const guild = await requireGuild(guildId);
  return { guild, slow: throttle(guild.actorId, "admin") };
}

function finish(
  guildId: string,
  result: Awaited<ReturnType<typeof adminApi.autoClean>>,
): Result {
  revalidatePath(`/dashboard/${guildId}/autoclean`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}

/** Adds or changes one channel's rule. */
export async function saveAutoCleanAction(
  guildId: string,
  channelId: string,
  maxAgeMinutes: number,
  keepPinned: boolean,
): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (typeof channelId !== "string" || !/^\d+$/.test(channelId))
    return fail("Choose a channel to clean.");
  if (!Number.isFinite(maxAgeMinutes))
    return fail("Choose how long messages are kept.");
  return finish(
    guildId,
    await adminApi.saveAutoClean(
      guild,
      channelId,
      Math.trunc(maxAgeMinutes),
      keepPinned === true,
    ),
  );
}

export async function deleteAutoCleanAction(
  guildId: string,
  channelId: string,
): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (!/^\d+$/.test(channelId)) return fail("That isn't a valid channel.");
  return finish(guildId, await adminApi.deleteAutoClean(guild, channelId));
}
