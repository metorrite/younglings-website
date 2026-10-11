"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type AutoReplyDef, type AutoReplyList, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const MATCHES = ["WORD", "STARTS", "EXACT"] as const;

/** Rebuilds a reply from untrusted input; the bot validates the content and explains any refusal. */
function clean(input: unknown): Omit<AutoReplyDef, "id"> | null {
  if (typeof input !== "object" || input === null) return null;
  const p = input as Record<string, unknown>;
  return {
    trigger: typeof p.trigger === "string" ? p.trigger.slice(0, 200) : "",
    match: MATCHES.includes(p.match as (typeof MATCHES)[number]) ? (p.match as AutoReplyDef["match"]) : "WORD",
    reply: typeof p.reply === "string" ? p.reply.slice(0, 1600) : "",
    cooldownSeconds: typeof p.cooldownSeconds === "number" && Number.isFinite(p.cooldownSeconds) ? Math.trunc(p.cooldownSeconds) : 30,
    enabled: p.enabled !== false,
  };
}

/** Creates the reply when `id` is null, otherwise replaces it. Like every dashboard action it checks the user against *that* server first. */
export async function saveGuildAutoReplyAction(guildId: string, id: string | null, input: unknown): Promise<WelcomeActionResult<AutoReplyDef>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const reply = clean(input);
  if (!reply) return { ok: false, error: "That reply couldn't be read.", problems: [] };
  if (id !== null && !/^\d+$/.test(id)) return { ok: false, error: "That isn't a valid reply.", problems: [] };

  const result = id === null ? await adminApi.createAutoReply(guild, reply) : await adminApi.updateAutoReply(guild, id, reply);
  revalidatePath(`/dashboard/${guildId}/autoresponder`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

export async function deleteGuildAutoReplyAction(guildId: string, id: string): Promise<WelcomeActionResult<AutoReplyList>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d+$/.test(id)) return { ok: false, error: "That isn't a valid reply.", problems: [] };

  const result = await adminApi.deleteAutoReply(guild, id);
  revalidatePath(`/dashboard/${guildId}/autoresponder`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
