"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { dashboardApi, type ApiResult, type WelcomeActionResult, type WelcomeConfig } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";
import { welcomeDraftFrom } from "@/lib/welcomeDraft";

/**
 * Server Actions for one server's welcome message on the bot dashboard. The server id is bound by the page, but it is
 * only ever a claim: each action starts by running `requireGuild`, which asks the bot whether this signed-in user may
 * manage that server, so changing the id in a forged request gets a 404, not someone else's server.
 */

function outcome<T>(result: ApiResult<T>): WelcomeActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

export async function saveGuildWelcomeAction(guildId: string, input: unknown): Promise<WelcomeActionResult<WelcomeConfig>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const draft = welcomeDraftFrom(input);
  if (!draft) return { ok: false, error: "That welcome message couldn't be read.", problems: [] };

  const result = await dashboardApi.saveWelcome(guild, draft);
  revalidatePath(`/dashboard/${guildId}`);
  return outcome(result);
}

export async function testGuildWelcomeAction(guildId: string, input: unknown): Promise<WelcomeActionResult<{ sent: boolean; channelName: string; dmSent: boolean }>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const draft = welcomeDraftFrom(input);
  if (!draft) return { ok: false, error: "That welcome message couldn't be read.", problems: [] };

  return outcome(await dashboardApi.testWelcome(guild, draft));
}
