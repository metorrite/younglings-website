"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type StaffDigest, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const int = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback);

/** Saves the staff digest's settings. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveStaffDigestAction(guildId: string, input: unknown): Promise<WelcomeActionResult<StaffDigest>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;
  const result = await adminApi.saveStaffDigest(guild, {
    enabled: p.enabled === true,
    channelId: typeof p.channelId === "string" && /^\d{1,20}$/.test(p.channelId) ? p.channelId : null,
    weekday: int(p.weekday, 1),
    hour: int(p.hour, 9),
  });
  revalidatePath(`/dashboard/${guildId}/staff-digest`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

/** Posts the digest now, in the saved channel. */
export async function sendStaffDigestAction(guildId: string): Promise<WelcomeActionResult<StaffDigest>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const result = await adminApi.sendStaffDigest(guild);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
