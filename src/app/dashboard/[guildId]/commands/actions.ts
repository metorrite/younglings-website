"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type HubCommandConfig, type HubCommandDraft, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Saves one command's settings. Like every dashboard action it starts by checking the signed-in user against *that* server, and
 * the bot then refuses a change to who may use a command from anyone below the Admin tier.
 */

const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^\d{1,20}$/.test(x)).slice(0, 25) : []);
const refs = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^(group:[a-z0-9]{1,24}|role:\d{1,20})$/.test(x)).slice(0, 25) : [];
const idOrNull = (v: unknown): string | null => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);

/** Rebuilds the browser's data field by field, so nothing unexpected is forwarded; the bot checks every group, role and channel itself. */
function draftFrom(input: unknown): HubCommandDraft | null {
  if (typeof input !== "object" || input === null) return null;
  const d = input as Record<string, unknown>;
  const signup = typeof d.signup === "object" && d.signup !== null ? (d.signup as Record<string, unknown>) : null;
  return {
    enabled: d.enabled === true,
    customAccess: d.customAccess === true,
    allowedRefs: refs(d.allowedRefs),
    channelIds: ids(d.channelIds),
    signup: signup
      ? { adminChannelId: idOrNull(signup.adminChannelId), lockAdminChannel: signup.lockAdminChannel === true, publicChannelIds: ids(signup.publicChannelIds) }
      : undefined,
  };
}

export async function saveHubCommandAction(guildId: string, key: string, input: unknown): Promise<WelcomeActionResult<HubCommandConfig>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^[a-z0-9_-]{1,32}$/.test(key)) return { ok: false, error: "That isn't a command.", problems: [] };
  const draft = draftFrom(input);
  if (!draft) return { ok: false, error: "Those settings couldn't be read.", problems: [] };

  const result = await adminApi.saveHubCommand(guild, key, draft);
  revalidatePath(`/dashboard/${guildId}`, "layout");
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
