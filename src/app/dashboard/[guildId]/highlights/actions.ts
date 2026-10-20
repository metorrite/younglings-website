"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type HighlightSettings, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const ids = (value: unknown) => (Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && /^\d+$/.test(x)).slice(0, 50) : []);

/** Saves a server's Highlights settings. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveGuildHighlightsAction(guildId: string, input: unknown): Promise<WelcomeActionResult<HighlightSettings>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;

  const result = await adminApi.saveHighlights(guild, {
    enabled: p.enabled === true,
    maxKeywords: typeof p.maxKeywords === "number" && Number.isFinite(p.maxKeywords) ? Math.trunc(p.maxKeywords) : 10,
    cooldownSeconds: typeof p.cooldownSeconds === "number" && Number.isFinite(p.cooldownSeconds) ? Math.trunc(p.cooldownSeconds) : 300,
    excludedChannels: ids(p.excludedChannels),
    allowedRoles: ids(p.allowedRoles),
  });
  revalidatePath(`/dashboard/${guildId}/highlights`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
