"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import {
  adminApi,
  type AutoDeleteList,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

type Result = WelcomeActionResult<AutoDeleteList>;
const fail = (error: string): Result => ({ ok: false, error, problems: [] });
const FILTERS = ["INVITES", "LINKS", "ATTACHMENTS"];

async function guard(guildId: string) {
  const guild = await requireGuild(guildId);
  return { guild, slow: throttle(guild.actorId, "admin") };
}

function finish(
  guildId: string,
  result: Awaited<ReturnType<typeof adminApi.autoDelete>>,
): Result {
  revalidatePath(`/dashboard/${guildId}/autodelete`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}

/** Adds or changes one channel's rule. */
export async function saveAutoDeleteAction(
  guildId: string,
  channelId: string,
  filters: string[],
): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (typeof channelId !== "string" || !/^\d+$/.test(channelId))
    return fail("Choose a channel.");
  if (!Array.isArray(filters)) return fail("Choose what to delete.");
  return finish(
    guildId,
    await adminApi.saveAutoDelete(
      guild,
      channelId,
      filters.filter((f) => FILTERS.includes(f)),
    ),
  );
}

export async function deleteAutoDeleteAction(
  guildId: string,
  channelId: string,
): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (!/^\d+$/.test(channelId)) return fail("That isn't a valid channel.");
  return finish(guildId, await adminApi.deleteAutoDelete(guild, channelId));
}
