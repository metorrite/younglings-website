"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import {
  adminApi,
  type AutoCleanFilters,
  type AutoCleanList,
  type AutoCleanPreview,
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

/** Reads the filters a form sent, falling back to "no filter" for anything that isn't one. */
function filtersOf(input: unknown): AutoCleanFilters {
  const p = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  return {
    authors: p.authors === "ONLY_BOTS" || p.authors === "ONLY_HUMANS" ? p.authors : "ALL",
    onlyWithAttachments: p.onlyWithAttachments === true,
    containsText: typeof p.containsText === "string" && p.containsText.trim() ? p.containsText.slice(0, 200) : null,
  };
}

/** Adds or changes one channel's rule. */
export async function saveAutoCleanAction(
  guildId: string,
  channelId: string,
  maxAgeMinutes: number,
  keepPinned: boolean,
  filters: AutoCleanFilters,
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
      filtersOf(filters),
    ),
  );
}

/** The dry run: how many messages this rule would delete right now. Reads the channel's history and deletes nothing. */
export async function previewAutoCleanAction(
  guildId: string,
  channelId: string,
  maxAgeMinutes: number,
  keepPinned: boolean,
  filters: AutoCleanFilters,
): Promise<WelcomeActionResult<AutoCleanPreview>> {
  const { guild, slow } = await guard(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof channelId !== "string" || !/^\d+$/.test(channelId))
    return { ok: false, error: "Choose a channel to check.", problems: [] };
  if (!Number.isFinite(maxAgeMinutes))
    return { ok: false, error: "Choose how long messages are kept.", problems: [] };
  const result = await adminApi.previewAutoClean(guild, channelId, Math.trunc(maxAgeMinutes), keepPinned === true, filtersOf(filters));
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
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
