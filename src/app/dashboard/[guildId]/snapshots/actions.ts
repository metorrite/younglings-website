"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type DevSnapshotMeta, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Taking and deleting dev snapshots. Like every dashboard action each starts with `requireGuild`; the bot then refuses anyone who isn't the owner of
 * the bot itself, so being an admin of a server is never enough. The zip is not returned here (it can be megabytes): the page links to the download route.
 */

const ID = /^snap-\d{8}-\d{6}-[0-9a-f]{4}$/;
const FOCUS = /^(event|ticket|member):\d{1,20}$/;

/** The website's own commit, so a bug report says which site build it was taken against. */
function siteCommit(): string {
  const raw = process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "";
  return /^[A-Za-z0-9._-]{1,64}$/.test(raw) ? raw : "";
}

export async function takeSnapshotAction(guildId: string, focus: unknown): Promise<WelcomeActionResult<{ snapshot: DevSnapshotMeta }>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const text = typeof focus === "string" ? focus.trim().toLowerCase() : "";
  if (text !== "" && !FOCUS.test(text)) return { ok: false, error: "Focus must look like event:12, ticket:34 or member:<Discord id>.", problems: [] };

  const result = await adminApi.takeDevSnapshot(guild, text, siteCommit());
  if (!result.ok) return { ok: false, error: result.error, problems: result.problems };
  revalidatePath(`/dashboard/${guildId}/snapshots`);
  const { id, guildId: snapGuild, createdAt, sizeBytes, requestedBy, focus: snapFocus } = result.data;
  return { ok: true, data: { snapshot: { id, guildId: snapGuild, createdAt, sizeBytes, requestedBy, focus: snapFocus } } };
}

export async function deleteSnapshotAction(guildId: string, id: unknown): Promise<WelcomeActionResult<{ deleted: string }>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof id !== "string" || !ID.test(id)) return { ok: false, error: "That isn't a snapshot.", problems: [] };

  const result = await adminApi.deleteDevSnapshot(guild, id);
  if (!result.ok) return { ok: false, error: result.error, problems: result.problems };
  revalidatePath(`/dashboard/${guildId}/snapshots`);
  return { ok: true, data: result.data };
}
