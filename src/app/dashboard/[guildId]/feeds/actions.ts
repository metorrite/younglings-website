"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import {
  adminApi,
  type FeedInput,
  type FeedList,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

type Result = WelcomeActionResult<FeedList>;
const fail = (error: string): Result => ({ ok: false, error, problems: [] });

async function guard(guildId: string) {
  const guild = await requireGuild(guildId);
  return { guild, slow: throttle(guild.actorId, "admin") };
}

function finish(
  guildId: string,
  result: Awaited<ReturnType<typeof adminApi.feeds>>,
): Result {
  revalidatePath(`/dashboard/${guildId}/feeds`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}

/** Adds a followed feed (no id) or changes one. */
export async function saveFeedAction(
  guildId: string,
  feed: FeedInput,
): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (feed?.kind !== "YOUTUBE" && feed?.kind !== "REDDIT")
    return fail("Choose YouTube or Reddit.");
  if (typeof feed.channelId !== "string" || !/^\d+$/.test(feed.channelId))
    return fail("Choose the channel to post in.");
  if (feed.id !== undefined && !/^\d+$/.test(feed.id))
    return fail("That isn't a valid feed.");
  return finish(
    guildId,
    await adminApi.saveFeed(guild, {
      id: feed.id,
      kind: feed.kind,
      source: String(feed.source ?? ""),
      flair: String(feed.flair ?? ""),
      channelId: feed.channelId,
      template: String(feed.template ?? ""),
      enabled: feed.enabled !== false,
    }),
  );
}

export async function deleteFeedAction(
  guildId: string,
  id: string,
): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (!/^\d+$/.test(id)) return fail("That isn't a valid feed.");
  return finish(guildId, await adminApi.deleteFeed(guild, id));
}
