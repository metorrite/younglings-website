"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ServerTagDraft, type ServerTagRule, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const id = (value: unknown): string | null => (typeof value === "string" && /^\d{1,20}$/.test(value) ? value : null);

/** Saves a server's server-tag settings. Like every dashboard action it starts by checking the user against *that* server; the bot checks the whole save before storing any of it. */
export async function saveServerTagAction(guildId: string, input: unknown): Promise<WelcomeActionResult<ServerTagRule>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  const draft: ServerTagDraft = {
    enabled: p.enabled === true,
    // an id that isn't digits is sent on as typed so the bot can say which one is wrong
    flaggedGuildIds: Array.isArray(p.flaggedGuildIds) ? p.flaggedGuildIds.filter((v): v is string => typeof v === "string").map((v) => v.trim().slice(0, 40)).slice(0, 60) : [],
    action: p.action === "TIMEOUT" || p.action === "KICK" || p.action === "BAN" ? p.action : "ALERT",
    timeoutMinutes: typeof p.timeoutMinutes === "number" && Number.isFinite(p.timeoutMinutes) ? Math.trunc(p.timeoutMinutes) : 0,
    alertChannelId: id(p.alertChannelId),
    exemptRoleIds: Array.isArray(p.exemptRoleIds) ? p.exemptRoleIds.map(id).filter((v): v is string => v !== null).slice(0, 25) : [],
  };
  const result = await adminApi.saveServerTag(guild, draft);
  revalidatePath(`/dashboard/${guildId}/servertags`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
