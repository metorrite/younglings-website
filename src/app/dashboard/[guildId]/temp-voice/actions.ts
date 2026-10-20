"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type TempVoiceList, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

type Result = WelcomeActionResult<TempVoiceList>;
const fail = (error: string): Result => ({ ok: false, error, problems: [] });
const id = (v: unknown) => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);

/** Makes a voice channel a hub (or has JonnyBot create one), or changes a hub's name pattern, category and limit. */
export async function saveTempVoiceHubAction(guildId: string, input: unknown): Promise<Result> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof input !== "object" || input === null) return fail("Those settings couldn't be read.");
  const p = input as Record<string, unknown>;
  const create = p.createHub === true;
  const hub = id(p.hubChannelId);
  if (!create && hub === null) return fail("Choose the voice channel people join to get their own.");
  const result = await adminApi.saveTempVoiceHub(guild, {
    hubChannelId: create ? undefined : (hub as string),
    createHub: create,
    hubName: create && typeof p.hubName === "string" ? p.hubName.slice(0, 100) : undefined,
    categoryId: id(p.categoryId),
    namePattern: typeof p.namePattern === "string" ? p.namePattern.slice(0, 120) : "",
    userLimit: typeof p.userLimit === "number" && Number.isFinite(p.userLimit) ? Math.trunc(p.userLimit) : 0,
  });
  revalidatePath(`/dashboard/${guildId}/temp-voice`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

export async function removeTempVoiceHubAction(guildId: string, hubChannelId: string): Promise<Result> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (id(hubChannelId) === null) return fail("That isn't a valid channel.");
  const result = await adminApi.deleteTempVoiceHub(guild, hubChannelId);
  revalidatePath(`/dashboard/${guildId}/temp-voice`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
