"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type WelcomeActionResult, type WelcomeConfig } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";
import { welcomeDraftFrom } from "@/lib/welcomeDraft";

const text = (v: unknown) => (typeof v === "string" ? v : "");

/** Posts (or checks) a message in one server. Like every dashboard action it starts by checking the user against *that* server. */
export async function postGuildMessageAction(
  guildId: string,
  input: unknown,
): Promise<{ ok: true; data: { warnings: string[] } } | { ok: false; error: string; problems: string[] }> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That message couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;

  const result = await adminApi.post(guild, {
    text: text(p.text),
    channelId: typeof p.channelId === "string" && /^\d+$/.test(p.channelId) ? p.channelId : undefined,
    convert: p.convert === true,
    dryRun: p.dryRun === true,
  });
  return result.ok ? { ok: true, data: { warnings: result.data.warnings } } : { ok: false, error: result.error, problems: result.problems };
}

/**
 * The ban announcement and "send an announcement" (with a ping), moved here from the old Announcements page (T-215). Each starts by running `requireGuild`,
 * which asks the bot whether this signed-in user may manage that server, so a forged server id gets a 404.
 */

function outcome<T>(result: ApiResult<T>): WelcomeActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

export async function saveBanAnnouncementAction(guildId: string, input: unknown): Promise<WelcomeActionResult<WelcomeConfig>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const draft = welcomeDraftFrom(input);
  if (!draft) return { ok: false, error: "That message couldn't be read.", problems: [] };

  const result = await adminApi.saveBanAnnouncement(guild, { ...draft, alsoDm: false, linkButton: false });
  revalidatePath(`/dashboard/${guildId}/post`);
  return outcome(result);
}

export async function testBanAnnouncementAction(guildId: string, input: unknown): Promise<WelcomeActionResult<{ sent: boolean; channelName: string }>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const draft = welcomeDraftFrom(input);
  if (!draft) return { ok: false, error: "That message couldn't be read.", problems: [] };

  return outcome(await adminApi.testBanAnnouncement(guild, { ...draft, alsoDm: false, linkButton: false }));
}

const idOrNull = (v: unknown): string | null => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);

/** Posts an announcement now. The bot refuses @everyone, @here and role pings the signed-in admin could not make themselves. */
export async function sendAnnouncementAction(guildId: string, input: unknown): Promise<WelcomeActionResult<{ sent: boolean; channelName: string }>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That announcement couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  const channelId = idOrNull(p.channelId);
  if (!channelId) return { ok: false, error: "Choose a channel.", problems: [] };

  return outcome(
    await adminApi.sendAnnouncement(guild, {
      channelId,
      message: typeof p.message === "string" ? p.message.slice(0, 2500) : "",
      roleId: idOrNull(p.roleId),
      everyone: p.everyone === true,
      here: p.here === true,
    }),
  );
}
