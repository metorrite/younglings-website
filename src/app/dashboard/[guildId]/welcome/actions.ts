"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, dashboardApi, type ApiResult, type WelcomeActionResult, type WelcomeCard, type WelcomeConfig } from "@/lib/jonnybot-admin";
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

const SLOTS = ["author_icon", "thumbnail", "image", "footer_icon", "card_bg"];

/** Deletes the stored picture for one place. The embed's address is cleared by the editor. */
export async function removeGuildWelcomeImageAction(guildId: string, slot: string): Promise<WelcomeActionResult<{ removed: boolean }>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!SLOTS.includes(slot)) return { ok: false, error: "That isn't a place a picture can go.", problems: [] };

  return outcome(await dashboardApi.removeWelcomeImage(guild, slot));
}

const colour = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 0xffffff ? v : fallback);

/** Saves the optional welcome picture. The bot checks the values again; this only rebuilds the exact shape it expects. */
export async function saveGuildWelcomeCardAction(guildId: string, input: unknown): Promise<WelcomeActionResult<WelcomeCard>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That welcome picture couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;

  const result = await adminApi.saveWelcomeCard(guild, {
    enabled: p.enabled === true,
    backgroundColor: colour(p.backgroundColor, 0x1e2230),
    backgroundImageUrl: typeof p.backgroundImageUrl === "string" ? p.backgroundImageUrl.slice(0, 2100) : "",
    textColor: colour(p.textColor, 0xffffff),
    title: typeof p.title === "string" ? p.title.slice(0, 200) : "",
    description: typeof p.description === "string" ? p.description.slice(0, 300) : "",
  });
  revalidatePath(`/dashboard/${guildId}/welcome`);
  return outcome(result);
}
