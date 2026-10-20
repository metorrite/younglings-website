"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import {
  adminApi,
  type AccountGate,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Saves a server's new-account settings. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveGuildAccountGateAction(
  guildId: string,
  input: unknown,
): Promise<WelcomeActionResult<AccountGate>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null)
    return {
      ok: false,
      error: "Those settings couldn't be read.",
      problems: [],
    };
  const p = input as Record<string, unknown>;

  const result = await adminApi.saveAccountGate(guild, {
    enabled: p.enabled === true,
    minAgeDays:
      typeof p.minAgeDays === "number" && Number.isFinite(p.minAgeDays)
        ? Math.trunc(p.minAgeDays)
        : 0,
    action: p.action === "KICK" ? "KICK" : "ALERT",
    alertChannelId:
      typeof p.alertChannelId === "string" && /^\d+$/.test(p.alertChannelId)
        ? p.alertChannelId
        : null,
    nameRulesEnabled: p.nameRulesEnabled === true,
    nameAction: p.nameAction === "KICK" ? "KICK" : p.nameAction === "BAN" ? "BAN" : "ALERT",
    nameRules: Array.isArray(p.nameRules) ? p.nameRules.filter((r): r is string => typeof r === "string").map((r) => r.slice(0, 100)).slice(0, 60) : [],
    exemptUserIds: Array.isArray(p.exemptUserIds) ? p.exemptUserIds.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 25)).filter((x) => x !== "").slice(0, 60) : [],
  });
  revalidatePath(`/dashboard/${guildId}/newaccounts`);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error, problems: result.problems };
}
