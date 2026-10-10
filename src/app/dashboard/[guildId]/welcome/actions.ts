"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { dashboardApi, type ApiResult, type WelcomeActionResult, type WelcomeConfig } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";
import { readUploadedFile, requestOrigin, uploadedImageUrl } from "@/lib/uploads";
import type { UploadResult } from "@/lib/uploadLimits";
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

const SLOTS = ["author_icon", "thumbnail", "image", "footer_icon"];

/** Uploads a picture for one place in the welcome embed, replacing the one there. Returns the address to put in the embed. */
export async function uploadGuildWelcomeImageAction(guildId: string, slot: string, form: FormData): Promise<UploadResult> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!SLOTS.includes(slot)) return { ok: false, error: "That isn't a place a picture can go.", problems: [] };
  const file = await readUploadedFile(form);
  if (!file.ok) return { ok: false, error: file.error, problems: [] };

  const result = await dashboardApi.uploadWelcomeImage(guild, slot, file.base64);
  if (!result.ok) return { ok: false, error: result.error, problems: result.problems };
  return { ok: true, data: { url: uploadedImageUrl(await requestOrigin(), result.data.token, result.data.version) } };
}

/** Deletes the stored picture for one place. The embed's address is cleared by the editor. */
export async function removeGuildWelcomeImageAction(guildId: string, slot: string): Promise<WelcomeActionResult<{ removed: boolean }>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!SLOTS.includes(slot)) return { ok: false, error: "That isn't a place a picture can go.", problems: [] };

  return outcome(await dashboardApi.removeWelcomeImage(guild, slot));
}
