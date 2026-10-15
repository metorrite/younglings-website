"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import type { CitadelCappers, WheelSettings, WheelWinner } from "@/lib/citadelTypes";
import { adminApi } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";
import { spread } from "@/lib/wheel";
import { renderWheelGif } from "@/lib/wheelGif";

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

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Locks in a week's winner. The wheel the winner was picked from (`labels`, one name per slice as the dashboard shows them, and the slice it landed
 * on) comes from the dashboard after a spin; for a past week typed in by hand there is no spin, so the week's own cappers are fetched and the winner
 * is added if they aren't among them. The picture is drawn here, on the website, with the same code as the on-screen wheel, and sent to the bot to
 * keep. If it can't be drawn the bot draws its own, so a locked week always ends up with a GIF.
 */
export async function lockCitadelWinnerAction(
  guildId: string,
  end: string,
  winner: string,
  labels: string[] | null,
  winnerIndex: number | null,
  manual: boolean,
): Promise<{ ok: true; data: WheelWinner; picture: "website" | "bot" } | Failure> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof end !== "string" || !DATE.test(end)) return fail("That isn't a date.");
  if (typeof winner !== "string" || !winner.trim() || winner.trim().length > 40) return fail("Say who won.");
  const name = winner.trim();

  let slices: string[];
  if (labels && labels.length > 0) {
    if (labels.length > 300 || labels.some((l) => typeof l !== "string" || l.length > 40)) return fail("Those entries aren't valid.");
    slices = labels;
  } else {
    const week = await adminApi.citadelCappers(guild, end);
    if (!week.ok) return fail(week.error, week.problems);
    slices = spread(week.data.cappers.map((c) => ({ name: c, entries: 1 })));
  }
  let at = winnerIndex !== null && winnerIndex >= 0 && winnerIndex < slices.length && slices[winnerIndex].toLowerCase() === name.toLowerCase() ? winnerIndex : -1;
  if (at < 0) at = slices.findIndex((s) => s.toLowerCase() === name.toLowerCase());
  if (at < 0) {
    slices = [...slices, name];
    at = slices.length - 1;
  }

  let gif: string | undefined;
  try {
    gif = renderWheelGif(slices, at).gif.toString("base64");
  } catch (error) {
    // the bot draws its own picture instead; locking the winner matters more than which program drew it
    console.error("Could not draw the wheel GIF on the website", error);
  }
  const result = await adminApi.citadelLock(guild, { end, winner: name, entries: slices, manual, gif });
  if (!result.ok) return fail(result.error, result.problems);
  revalidatePath(`/dashboard/${guildId}/citadel-wheel`);
  return { ok: true, data: result.data, picture: gif ? "website" : "bot" };
}

/** Takes the lock off a week (its winner and picture are deleted), so it can be spun again. */
export async function unlockCitadelWinnerAction(guildId: string, end: string): Promise<{ ok: true; data: WheelWinner[] } | Failure> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof end !== "string" || !DATE.test(end)) return fail("That isn't a date.");
  const result = await adminApi.citadelUnlock(guild, end);
  if (!result.ok) return fail(result.error, result.problems);
  revalidatePath(`/dashboard/${guildId}/citadel-wheel`);
  return { ok: true, data: result.data.winners };
}

/** One locked week with its announcement text, for copying (and to see whether the bot has finished drawing its picture). */
export async function citadelWinnerAction(guildId: string, end: string): Promise<{ ok: true; data: WheelWinner } | Failure> {
  const guild = await requireGuild(guildId);
  if (typeof end !== "string" || !DATE.test(end)) return fail("That isn't a date.");
  const result = await adminApi.citadelWinner(guild, end);
  return result.ok ? { ok: true, data: result.data } : fail(result.error, result.problems);
}

/** Posts a locked week's announcement and picture in the channel the server chose. */
export async function postLockedCitadelWinnerAction(guildId: string, end: string): Promise<{ ok: true; channel: string } | Failure> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof end !== "string" || !DATE.test(end)) return fail("That isn't a date.");
  const result = await adminApi.citadelPostLocked(guild, end);
  return result.ok ? { ok: true, channel: result.data.channel } : fail(result.error, result.problems);
}
