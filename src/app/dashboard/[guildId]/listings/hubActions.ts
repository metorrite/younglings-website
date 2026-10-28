"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import type { HubModeration } from "@/lib/hubModeration";
import { adminApi, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

type Result = WelcomeActionResult<HubModeration>;
const fail = (error: string): Result => ({ ok: false, error, problems: [] });

/**
 * The events hub's moderation (T-218). The bot checks that the asker is its owner on every one of these; this only checks the shape of the input, so a
 * crafted call can't reach any other route.
 */
async function post(guildId: string, path: string, body?: Record<string, string>): Promise<Result> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  const result = await adminApi.eventsCall(guild, "POST", `hub-moderation/${path}`, body);
  revalidatePath(`/dashboard/${guildId}/listings`);
  return result.ok ? { ok: true, data: result.data as HubModeration } : { ok: false, error: result.error, problems: result.problems };
}

const id = (raw: string) => typeof raw === "string" && /^\d{1,20}$/.test(raw);
const reasonOf = (raw: string) => (typeof raw === "string" ? raw.slice(0, 300) : "");

export async function unlistHubEventAction(guildId: string, eventId: string, reason: string): Promise<Result> {
  return id(eventId) ? post(guildId, `events/${eventId}/unlist`, { reason: reasonOf(reason) }) : fail("That isn't a valid event.");
}

export async function relistHubEventAction(guildId: string, eventId: string): Promise<Result> {
  return id(eventId) ? post(guildId, `events/${eventId}/relist`) : fail("That isn't a valid event.");
}

export async function resolveHubReportAction(guildId: string, reportId: string, status: string): Promise<Result> {
  if (!id(reportId)) return fail("That isn't a valid report.");
  if (status !== "DISMISSED" && status !== "ACTIONED") return fail("Close a report as dismissed or actioned.");
  return post(guildId, `reports/${reportId}/resolve`, { status });
}

export async function barHubServerAction(guildId: string, serverId: string, reason: string): Promise<Result> {
  return id(serverId) ? post(guildId, `servers/${serverId}/bar`, { reason: reasonOf(reason) }) : fail("That isn't a valid server.");
}

export async function liftHubServerAction(guildId: string, serverId: string): Promise<Result> {
  return id(serverId) ? post(guildId, `servers/${serverId}/lift`) : fail("That isn't a valid server.");
}
