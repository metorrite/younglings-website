"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type BotNotice, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Posting and removing the notices every server's dashboard shows. Like every dashboard action each starts with `requireGuild`; the
 * bot then refuses anyone who isn't the owner of the bot itself, so being an admin of a server is never enough to speak to all of them.
 */

const SEVERITIES: BotNotice["severity"][] = ["info", "warning", "issue"];

export async function addNoticeAction(guildId: string, severity: unknown, body: unknown): Promise<WelcomeActionResult<{ notices: BotNotice[] }>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const level = SEVERITIES.find((s) => s === severity);
  if (!level || typeof body !== "string") return { ok: false, error: "That notice couldn't be read.", problems: [] };

  const result = await adminApi.addNotice(guild, level, body.trim().slice(0, 500));
  revalidatePath(`/dashboard/${guildId}`, "layout");
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

export async function removeNoticeAction(guildId: string, id: unknown): Promise<WelcomeActionResult<{ notices: BotNotice[] }>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof id !== "string" || !/^\d{1,19}$/.test(id)) return { ok: false, error: "That isn't a notice.", problems: [] };

  const result = await adminApi.removeNotice(guild, id);
  revalidatePath(`/dashboard/${guildId}`, "layout");
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
