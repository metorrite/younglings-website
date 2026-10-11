"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import {
  adminApi,
  type SuggestionList,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

type Result = WelcomeActionResult<SuggestionList>;
const fail = (error: string): Result => ({ ok: false, error, problems: [] });
const STATUSES = ["PENDING", "APPROVED", "DENIED", "IMPLEMENTED"];

async function guard(guildId: string) {
  const guild = await requireGuild(guildId);
  return { guild, slow: throttle(guild.actorId, "admin") };
}

function finish(
  guildId: string,
  result: Awaited<ReturnType<typeof adminApi.suggestions>>,
): Result {
  revalidatePath(`/dashboard/${guildId}/suggestions`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}

/** Chooses (or clears) the channel suggestions are posted in. */
export async function saveSuggestionChannelAction(
  guildId: string,
  channelId: string | null,
): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (channelId !== null && !/^\d+$/.test(channelId))
    return fail("That channel isn't valid.");
  return finish(guildId, await adminApi.saveSuggestionChannel(guild, channelId));
}

export async function decideSuggestionAction(
  guildId: string,
  id: string,
  status: string,
  note: string,
): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (!/^\d+$/.test(id)) return fail("That isn't a valid suggestion.");
  if (!STATUSES.includes(status)) return fail("Choose a decision.");
  return finish(
    guildId,
    await adminApi.decideSuggestion(
      guild,
      id,
      status,
      typeof note === "string" ? note.slice(0, 500) : "",
    ),
  );
}

export async function deleteSuggestionAction(
  guildId: string,
  id: string,
): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (!/^\d+$/.test(id)) return fail("That isn't a valid suggestion.");
  return finish(guildId, await adminApi.deleteSuggestion(guild, id));
}
