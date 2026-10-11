"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/admin/(console)/actions";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ScheduledPost } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const text = (v: unknown) => (typeof v === "string" ? v : "");

export async function scheduleGuildPostAction(guildId: string, input: unknown): Promise<ActionResult<ScheduledPost[]>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  const raw = (input ?? {}) as Record<string, unknown>;
  const channelId = text(raw.channelId);
  if (!/^\d+$/.test(channelId)) return { ok: false, error: "Choose a channel." };
  const sendAt = text(raw.sendAt);
  if (Number.isNaN(Date.parse(sendAt))) return { ok: false, error: "Pick when it should be posted." };

  const result = await adminApi.schedulePost(guild, { text: text(raw.text), channelId, convert: raw.convert === true, sendAt: new Date(sendAt).toISOString() });
  if (!result.ok) return { ok: false, error: result.problems[0] ?? result.error };
  revalidatePath(`/dashboard/${guildId}/scheduled`);
  const list = await adminApi.scheduled(guild);
  return list.ok ? { ok: true, data: list.data.posts } : { ok: false, error: list.error };
}

export async function cancelGuildScheduledAction(guildId: string, id: number): Promise<ActionResult<ScheduledPost[]>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!Number.isInteger(id)) return { ok: false, error: "That post couldn't be found." };
  const result = await adminApi.cancelScheduled(guild, id);
  if (result.ok) revalidatePath(`/dashboard/${guildId}/scheduled`);
  return result.ok ? { ok: true, data: result.data.posts } : { ok: false, error: result.error };
}
