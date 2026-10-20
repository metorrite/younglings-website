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
  rule: unknown,
): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (typeof channelId !== "string" || !/^\d+$/.test(channelId))
    return fail("Choose a channel.");
  if (typeof rule !== "object" || rule === null) return fail("Choose what to delete.");
  const r = rule as Record<string, unknown>;
  if (!Array.isArray(r.filters)) return fail("Choose what to delete.");
  const roleMode = r.roleMode === "ONLY_WITH" || r.roleMode === "EXCEPT_WITH" ? r.roleMode : "EVERYONE";
  return finish(
    guildId,
    await adminApi.saveAutoDelete(guild, channelId, {
      filters: r.filters.filter((f): f is string => typeof f === "string" && FILTERS.includes(f)),
      words: Array.isArray(r.words) ? r.words.filter((w): w is string => typeof w === "string").map((w) => w.slice(0, 80)).slice(0, 40) : [],
      roleMode,
      roleIds: Array.isArray(r.roleIds) ? r.roleIds.filter((x): x is string => typeof x === "string" && /^\d{1,20}$/.test(x)).slice(0, 20) : [],
      delaySeconds: typeof r.delaySeconds === "number" && Number.isFinite(r.delaySeconds) ? Math.trunc(r.delaySeconds) : 0,
    }),
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
