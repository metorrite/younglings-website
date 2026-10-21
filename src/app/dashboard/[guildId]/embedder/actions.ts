"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type EmbedderMessage, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";
import { welcomeDraftFrom } from "@/lib/welcomeDraft";

/**
 * Server Actions for the Message embedder. Each starts by running `requireGuild`, which asks the bot whether this signed-in user may manage that
 * server, so a forged server id gets a 404; the bot then judges every post, edit, delete and clone against the admin's own channel permissions.
 */

function outcome<T>(result: ApiResult<T>): WelcomeActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

const idOrNull = (v: unknown): string | null => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);
const name = (v: unknown): string => (typeof v === "string" ? v.slice(0, 200) : "");

async function guarded(guildId: string) {
  const guild = await requireGuild(guildId);
  return { guild, slow: throttle(guild.actorId, "admin") };
}

const unreadable = (): { ok: false; error: string; problems: string[] } => ({ ok: false, error: "That message couldn't be read.", problems: [] });

/** Saves a draft (no id) or the changes to a stored message. With `apply`, a posted message is also updated in Discord. */
export async function saveEmbedderMessageAction(guildId: string, input: unknown): Promise<WelcomeActionResult<EmbedderMessage>> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return unreadable();
  const p = input as Record<string, unknown>;
  const message = welcomeDraftFrom(p.message);
  if (!message) return unreadable();
  // The channel, the on/off switch and the DM copy are the welcome's; they mean nothing for an embedder message.
  const clean = { ...message, enabled: false, channelId: null, alsoDm: false, linkButton: false };

  const id = idOrNull(p.id);
  const result = id
    ? await adminApi.saveEmbedderMessage(guild, id, { name: name(p.name), message: clean, apply: p.apply === true })
    : await adminApi.createEmbedderDraft(guild, { name: name(p.name), message: clean });
  revalidatePath(`/dashboard/${guildId}/embedder`);
  return outcome(result);
}

export async function postEmbedderMessageAction(guildId: string, id: string, channelId: string): Promise<WelcomeActionResult<EmbedderMessage>> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  const safeId = idOrNull(id);
  const channel = idOrNull(channelId);
  if (!safeId || !channel) return { ok: false, error: "Choose a channel.", problems: [] };
  const result = await adminApi.postEmbedderMessage(guild, safeId, channel);
  revalidatePath(`/dashboard/${guildId}/embedder`);
  return outcome(result);
}

export async function cloneEmbedderMessageAction(guildId: string, id: string, channelId: string): Promise<WelcomeActionResult<EmbedderMessage>> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  const safeId = idOrNull(id);
  const channel = idOrNull(channelId);
  if (!safeId || !channel) return { ok: false, error: "Choose a channel.", problems: [] };
  const result = await adminApi.cloneEmbedderMessage(guild, safeId, channel);
  revalidatePath(`/dashboard/${guildId}/embedder`);
  return outcome(result);
}

export async function deleteEmbedderMessageAction(guildId: string, id: string): Promise<WelcomeActionResult<{ deleted: boolean }>> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return { ok: false, error: slow, problems: [] };
  const safeId = idOrNull(id);
  if (!safeId) return { ok: false, error: "That message doesn't exist.", problems: [] };
  const result = await adminApi.deleteEmbedderMessage(guild, safeId);
  revalidatePath(`/dashboard/${guildId}/embedder`);
  return outcome(result);
}
