"use server";

import { requireGuild } from "@/lib/dashboard";
import type { CitadelCappers, WheelSettings } from "@/lib/citadelTypes";
import { adminApi } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

type Failure = { ok: false; error: string; problems: string[] };
const fail = (error: string, problems: string[] = []): Failure => ({ ok: false, error, problems });

/** Who capped in the week that ended on `end` (a Wednesday, YYYY-MM-DD), or the week that just finished when `end` is null. Starts by checking the user against that server. */
export async function citadelCappersAction(
  guildId: string,
  end: string | null,
): Promise<{ ok: true; data: CitadelCappers } | { ok: false; error: string }> {
  const guild = await requireGuild(guildId);
  if (end !== null && !/^\d{4}-\d{2}-\d{2}$/.test(end)) return { ok: false, error: "That isn't a date." };
  const result = await adminApi.citadelCappers(guild, end);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

/** Saves how winners are announced: auto-post on or off, the channel, and the message. The bot checks the channel and the message. */
export async function saveCitadelWheelAction(
  guildId: string,
  autoPost: boolean,
  channelId: string | null,
  message: string,
): Promise<{ ok: true; data: WheelSettings } | Failure> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof autoPost !== "boolean" || typeof message !== "string" || message.length > 5000) return fail("Those settings aren't valid.");
  if (channelId !== null && !/^\d+$/.test(channelId)) return fail("Choose a channel from the list.");
  const result = await adminApi.saveCitadelWheel(guild, { autoPost, channelId, message });
  return result.ok ? { ok: true, data: result.data } : fail(result.error, result.problems);
}

/** Announces the winner the wheel landed on, in the channel the server chose, with the configured message and a GIF of the wheel stopping on them. */
export async function postCitadelWinnerAction(
  guildId: string,
  winner: string,
  entries: string[],
  end: string,
): Promise<{ ok: true; channel: string } | Failure> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof winner !== "string" || !winner.trim() || winner.length > 40) return fail("Spin the wheel first.");
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 300 || entries.some((e) => typeof e !== "string" || e.length > 40)) return fail("Those entries aren't valid.");
  if (typeof end !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return fail("That isn't a date.");
  const result = await adminApi.citadelPost(guild, { winner, entries, end });
  return result.ok ? { ok: true, channel: result.data.channel } : fail(result.error, result.problems);
}
