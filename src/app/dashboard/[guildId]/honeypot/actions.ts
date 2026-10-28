"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type Honeypot, type HoneypotDraft, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const id = (value: unknown): string | null => (typeof value === "string" && /^\d{1,20}$/.test(value) ? value : null);

/** Saves a server's honeypot settings. Like every dashboard action it starts by checking the user against *that* server; the bot checks the whole save before storing any of it. */
export async function saveHoneypotAction(guildId: string, input: unknown): Promise<WelcomeActionResult<Honeypot>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  const draft: HoneypotDraft = {
    enabled: p.enabled === true,
    channelId: id(p.channelId),
    roleId: id(p.roleId),
    action: p.action === "BAN" || p.action === "KICK" ? p.action : "TIMEOUT",
    timeoutMinutes: typeof p.timeoutMinutes === "number" && Number.isFinite(p.timeoutMinutes) ? Math.trunc(p.timeoutMinutes) : 0,
    exemptRoleIds: Array.isArray(p.exemptRoleIds) ? p.exemptRoleIds.map(id).filter((v): v is string => v !== null).slice(0, 25) : [],
    deleteDays: typeof p.deleteDays === "number" && Number.isFinite(p.deleteDays) ? Math.trunc(p.deleteDays) : 0,
  };
  const result = await adminApi.saveHoneypot(guild, draft);
  revalidatePath(`/dashboard/${guildId}/honeypot`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
