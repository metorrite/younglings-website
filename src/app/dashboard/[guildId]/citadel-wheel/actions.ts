"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import type { CitadelCappers, CofferHolderInfo, WheelSettings, WheelWeek } from "@/lib/citadelTypes";
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
  // Discord draws the wheel under the whole message wherever {wheel} is, so keeping the tag last matches what is shown
  const text = message.trim();
  if (text.includes("{wheel}") && (!text.endsWith("{wheel}") || text.indexOf("{wheel}") !== text.lastIndexOf("{wheel}"))) {
    return fail("Put {wheel} once, as the very last thing in the message. Everything above it is one message and the wheel goes in a second message.");
  }
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
const MAX_WINNERS = 10;

/** Draws the GIF for `slices` landing on slice `at` and sends the winner to the bot to lock. The bot draws its own picture if this one can't be made. */
async function lockOne(
  guild: Awaited<ReturnType<typeof requireGuild>>,
  end: string,
  name: string,
  slices: string[],
  at: number,
  manual: boolean,
): Promise<{ ok: true; data: WheelWeek; picture: "website" | "bot" } | Failure> {
  let gif: string | undefined;
  try {
    gif = renderWheelGif(slices, at).gif.toString("base64");
  } catch (error) {
    // the bot draws its own picture instead; locking the winner matters more than which program drew it
    console.error("Could not draw the wheel GIF on the website", error);
  }
  const result = await adminApi.citadelLock(guild, { end, winner: name, entries: slices, manual, gif });
  if (!result.ok) return fail(result.error, result.problems);
  return { ok: true, data: result.data, picture: gif ? "website" : "bot" };
}

/**
 * Locks in the next place of a week (first place for the first winner). The wheel the winner was picked from (`labels`, one name per slice as the
 * dashboard shows them, and the slice it landed on) comes from the dashboard after a spin. The picture is drawn here, on the website, with the same code
 * as the on-screen wheel, and sent to the bot to keep. If it can't be drawn the bot draws its own, so a locked winner always ends up with a GIF.
 */
export async function lockCitadelWinnerAction(
  guildId: string,
  end: string,
  winner: string,
  labels: string[],
  winnerIndex: number,
): Promise<{ ok: true; data: WheelWeek; picture: "website" | "bot" } | Failure> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof end !== "string" || !DATE.test(end)) return fail("That isn't a date.");
  if (typeof winner !== "string" || !winner.trim() || winner.trim().length > 40) return fail("Say who won.");
  if (!Array.isArray(labels) || labels.length === 0 || labels.length > 300 || labels.some((l) => typeof l !== "string" || l.length > 40)) return fail("Those entries aren't valid.");
  const name = winner.trim();
  let slices = labels;
  let at = Number.isInteger(winnerIndex) && winnerIndex >= 0 && winnerIndex < slices.length && slices[winnerIndex].toLowerCase() === name.toLowerCase() ? winnerIndex : -1;
  if (at < 0) at = slices.findIndex((s) => s.toLowerCase() === name.toLowerCase());
  if (at < 0) {
    slices = [...slices, name];
    at = slices.length - 1;
  }
  const result = await lockOne(guild, end, name, slices, at, false);
  if (result.ok) revalidatePath(`/dashboard/${guildId}/citadel-wheel`);
  return result;
}

/**
 * Records winners of a past week typed in by hand, in order of place. There is no spin, so each winner gets a wheel made from the week's own cappers
 * (without the winners before them, plus themselves if they weren't one), and a GIF landing on them. Stops at the first problem and says how many were
 * recorded, so nothing is left half-explained.
 */
export async function recordPastWeekAction(guildId: string, end: string, names: string[]): Promise<{ ok: true; data: WheelWeek } | Failure> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof end !== "string" || !DATE.test(end)) return fail("That isn't a date.");
  if (!Array.isArray(names) || names.length === 0 || names.length > MAX_WINNERS) return fail(`Give between 1 and ${MAX_WINNERS} winners.`);
  const cleaned: string[] = [];
  for (const raw of names) {
    const name = typeof raw === "string" ? raw.trim() : "";
    if (!name || name.length > 40) return fail("Each winner needs a name of up to 40 characters.");
    if (cleaned.some((c) => c.toLowerCase() === name.toLowerCase())) return fail(`${name} is listed twice.`);
    cleaned.push(name);
  }
  const week = await adminApi.citadelCappers(guild, end);
  if (!week.ok) return fail(week.error, week.problems);
  const already = (week.data.locked?.winners ?? []).map((w) => w.winner.toLowerCase());
  let last: WheelWeek | null = week.data.locked;
  let done = 0;
  for (const name of cleaned) {
    const taken = new Set([...already, ...cleaned.slice(0, done).map((n) => n.toLowerCase())]);
    const base = spread(week.data.cappers.filter((c) => !taken.has(c.toLowerCase())).map((c) => ({ name: c, entries: 1 })));
    let slices = base;
    let at = slices.findIndex((s) => s.toLowerCase() === name.toLowerCase());
    if (at < 0) {
      slices = [...slices, name];
      at = slices.length - 1;
    }
    const result = await lockOne(guild, end, name, slices, at, true);
    if (!result.ok) return fail(done === 0 ? result.error : `${done} of ${cleaned.length} winners were recorded, then: ${result.error}`, result.problems);
    last = result.data;
    done++;
  }
  revalidatePath(`/dashboard/${guildId}/citadel-wheel`);
  return { ok: true, data: last as WheelWeek };
}

/** Takes the lock off a whole week (its winners and pictures are deleted), so it can be spun again. The bot refuses once a prize has been recorded. */
export async function unlockCitadelWinnerAction(guildId: string, end: string): Promise<{ ok: true; data: WheelWeek[] } | Failure> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof end !== "string" || !DATE.test(end)) return fail("That isn't a date.");
  const result = await adminApi.citadelUnlock(guild, end);
  if (!result.ok) return fail(result.error, result.problems);
  revalidatePath(`/dashboard/${guildId}/citadel-wheel`);
  return { ok: true, data: result.data.weeks };
}

/** One locked week with its announcement text, for copying (and to see whether the bot has finished drawing its pictures). */
export async function citadelWinnerAction(guildId: string, end: string): Promise<{ ok: true; data: WheelWeek } | Failure> {
  const guild = await requireGuild(guildId);
  if (typeof end !== "string" || !DATE.test(end)) return fail("That isn't a date.");
  const result = await adminApi.citadelWinner(guild, end);
  return result.ok ? { ok: true, data: result.data } : fail(result.error, result.problems);
}

/** Posts a locked week's announcement and pictures in the channel the server chose. */
export async function postLockedCitadelWinnerAction(guildId: string, end: string): Promise<{ ok: true; channel: string } | Failure> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof end !== "string" || !DATE.test(end)) return fail("That isn't a date.");
  const result = await adminApi.citadelPostLocked(guild, end);
  return result.ok ? { ok: true, channel: result.data.channel } : fail(result.error, result.problems);
}

/** Marks a winner's prize as given (paid some way other than the coffer), or puts it back to not given. */
export async function markCitadelPrizeAction(guildId: string, end: string, place: number, given: boolean): Promise<{ ok: true; data: WheelWeek } | Failure> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof end !== "string" || !DATE.test(end) || !Number.isInteger(place) || place < 1 || place > MAX_WINNERS) return fail("That isn't a winner.");
  const result = await adminApi.citadelPrize(guild, { end, place, action: given ? "given" : "pending" });
  if (!result.ok) return fail(result.error, result.problems);
  revalidatePath(`/dashboard/${guildId}/citadel-wheel`);
  return { ok: true, data: result.data };
}

/** Records a winner's prize in the clan coffer: who paid it, how much, and (when their RuneScape name isn't linked) which Discord account received it. */
export async function recordCitadelPrizeAction(
  guildId: string,
  end: string,
  place: number,
  input: { amount: string; paidBy: string; recipient: string | null; note: string },
): Promise<{ ok: true; data: WheelWeek } | Failure> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof end !== "string" || !DATE.test(end) || !Number.isInteger(place) || place < 1 || place > MAX_WINNERS) return fail("That isn't a winner.");
  if (typeof input.amount !== "string" || !input.amount.trim() || input.amount.length > 30) return fail("Enter how much was paid, like 5m or 500k.");
  if (typeof input.paidBy !== "string" || !/^\d{1,20}$/.test(input.paidBy)) return fail("Choose who paid the prize.");
  if (input.recipient !== null && (typeof input.recipient !== "string" || !/^\d{1,20}$/.test(input.recipient))) return fail("That isn't a Discord user id.");
  if (typeof input.note !== "string" || input.note.length > 200) return fail("Keep the note to 200 characters or fewer.");
  const result = await adminApi.citadelPrizeCoffer(guild, {
    end,
    place,
    amount: input.amount.trim(),
    paidBy: input.paidBy,
    ...(input.recipient ? { recipient: input.recipient } : {}),
    ...(input.note.trim() ? { note: input.note.trim() } : {}),
  });
  if (!result.ok) return fail(result.error, result.problems);
  revalidatePath(`/dashboard/${guildId}/citadel-wheel`);
  return { ok: true, data: result.data };
}

/** Who holds gp in the clan coffer, for choosing who paid a prize. */
export async function citadelHoldersAction(guildId: string): Promise<{ ok: true; data: CofferHolderInfo[] } | Failure> {
  const guild = await requireGuild(guildId);
  const result = await adminApi.citadelHolders(guild);
  return result.ok ? { ok: true, data: result.data.holders } : fail(result.error, result.problems);
}
