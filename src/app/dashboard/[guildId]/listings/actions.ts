"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ClanListings, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

type Result = WelcomeActionResult<ClanListings>;
const fail = (error: string): Result => ({ ok: false, error, problems: [] });

async function guard(guildId: string) {
  const guild = await requireGuild(guildId);
  return { guild, slow: throttle(guild.actorId, "admin") };
}

function finish(guildId: string, result: Awaited<ReturnType<typeof adminApi.clanListings>>): Result {
  revalidatePath(`/dashboard/${guildId}/listings`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

// The bot checks that the asker is its owner on every one of these; this only tidies the input.
export async function suspendClanListingAction(guildId: string, targetGuildId: string, reason: string): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (!/^\d+$/.test(targetGuildId)) return fail("That isn't a valid server.");
  return finish(guildId, await adminApi.suspendClanListing(guild, targetGuildId, typeof reason === "string" ? reason.slice(0, 300) : ""));
}

export async function restoreClanListingAction(guildId: string, targetGuildId: string): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (!/^\d+$/.test(targetGuildId)) return fail("That isn't a valid server.");
  return finish(guildId, await adminApi.restoreClanListing(guild, targetGuildId));
}

export async function resolveClanReportAction(guildId: string, id: string, status: string): Promise<Result> {
  const { guild, slow } = await guard(guildId);
  if (slow) return fail(slow);
  if (!/^\d+$/.test(id)) return fail("That isn't a valid report.");
  if (status !== "DISMISSED" && status !== "ACTIONED") return fail("Close a report as dismissed or actioned.");
  return finish(guildId, await adminApi.resolveClanReport(guild, id, status));
}
