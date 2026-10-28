"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type CustomTagDef, type CustomTagList, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const DELIVERIES = ["CHANNEL", "PRIVATE", "DM"] as const;

/** Rebuilds a tag from untrusted input; the bot validates the content and explains any refusal. */
function clean(input: unknown): Omit<CustomTagDef, "id" | "uses"> | null {
  if (typeof input !== "object" || input === null) return null;
  const p = input as Record<string, unknown>;
  return {
    name: typeof p.name === "string" ? p.name.slice(0, 64) : "",
    content: typeof p.content === "string" ? p.content.slice(0, 2000) : "",
    embed: p.embed === true,
    embedTitle: typeof p.embedTitle === "string" ? p.embedTitle.slice(0, 200) : "",
    embedColor: typeof p.embedColor === "string" ? p.embedColor.slice(0, 16) : "",
    delivery: DELIVERIES.includes(p.delivery as (typeof DELIVERIES)[number]) ? (p.delivery as CustomTagDef["delivery"]) : "CHANNEL",
    allowedRoles: Array.isArray(p.allowedRoles) ? p.allowedRoles.filter((x): x is string => typeof x === "string" && /^\d+$/.test(x)).slice(0, 25) : [],
    cooldownSeconds: typeof p.cooldownSeconds === "number" && Number.isFinite(p.cooldownSeconds) ? Math.trunc(p.cooldownSeconds) : 0,
    enabled: p.enabled !== false,
  };
}

/** Switches custom tags on or off for the server. Like every dashboard action it checks the user against *that* server first. */
export async function setGuildCustomTagsEnabledAction(guildId: string, enabled: boolean): Promise<WelcomeActionResult<CustomTagList>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const result = await adminApi.setCustomTagsEnabled(guild, enabled === true);
  revalidatePath(`/dashboard/${guildId}/custom-tags`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

/** Creates the tag when `id` is null, otherwise replaces it. */
export async function saveGuildCustomTagAction(guildId: string, id: string | null, input: unknown): Promise<WelcomeActionResult<CustomTagDef>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const tag = clean(input);
  if (!tag) return { ok: false, error: "That tag couldn't be read.", problems: [] };
  if (id !== null && !/^\d+$/.test(id)) return { ok: false, error: "That isn't a valid tag.", problems: [] };

  const result = id === null ? await adminApi.createCustomTag(guild, tag) : await adminApi.updateCustomTag(guild, id, tag);
  revalidatePath(`/dashboard/${guildId}/custom-tags`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

export async function deleteGuildCustomTagAction(guildId: string, id: string): Promise<WelcomeActionResult<CustomTagList>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d+$/.test(id)) return { ok: false, error: "That isn't a valid tag.", problems: [] };

  const result = await adminApi.deleteCustomTag(guild, id);
  revalidatePath(`/dashboard/${guildId}/custom-tags`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
