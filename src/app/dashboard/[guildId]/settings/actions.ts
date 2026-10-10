"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ServerSetup, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Server Actions for one server's basic setup. The server id is bound by the page but is only ever a claim: each action
 * starts with `requireGuild`, which asks the bot whether this signed-in user may manage that server.
 */

const id = (v: unknown): string | null => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);

/** Rebuilds the browser's data field by field, so nothing unexpected is forwarded; the bot then checks every value against the server. */
function setupFrom(input: unknown): ServerSetup | null {
  if (typeof input !== "object" || input === null) return null;
  const s = input as Record<string, unknown>;
  const clan = typeof s.clanName === "string" ? s.clanName.trim().slice(0, 30) : "";
  return {
    clanName: clan === "" ? null : clan,
    clanEnabled: s.clanEnabled === true,
    clanActive: false, // derived by the bot, ignored on save
    verificationReviewChannelId: id(s.verificationReviewChannelId),
    renameAlertChannelId: id(s.renameAlertChannelId),
    verifiedClanRoleId: id(s.verifiedClanRoleId),
    verifiedNonClanRoleId: id(s.verifiedNonClanRoleId),
    unverifiedRoleId: id(s.unverifiedRoleId),
    onboardingRoleId: id(s.onboardingRoleId),
  };
}

export async function saveServerSetupAction(guildId: string, input: unknown): Promise<WelcomeActionResult<ServerSetup>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const setup = setupFrom(input);
  if (!setup) return { ok: false, error: "Those settings couldn't be read.", problems: [] };

  const result = await adminApi.saveServerSetup(guild, setup);
  revalidatePath(`/dashboard/${guildId}`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
