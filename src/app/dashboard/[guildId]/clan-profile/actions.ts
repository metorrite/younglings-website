"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ClanProfileData, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

type Result = WelcomeActionResult<ClanProfileData>;
const fail = (error: string): Result => ({ ok: false, error, problems: [] });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const optStr = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.slice(0, max) : null);

/** Saves the clan profile. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveClanProfileAction(guildId: string, input: unknown): Promise<Result> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (typeof input !== "object" || input === null) return fail("That profile couldn't be read.");
  const p = input as Record<string, unknown>;

  const result = await adminApi.saveClanProfile(guild, {
    visibility: p.visibility === "PUBLIC" || p.visibility === "UNLISTED" ? p.visibility : "PRIVATE",
    slug: optStr(p.slug, 40),
    displayName: str(p.displayName, 80),
    tagline: str(p.tagline, 200),
    description: str(p.description, 2000),
    logoUrl: optStr(p.logoUrl, 400),
    colour: typeof p.colour === "number" && Number.isFinite(p.colour) ? Math.trunc(p.colour) : null,
    timezone: optStr(p.timezone, 60),
    focus: Array.isArray(p.focus) ? p.focus.filter((f): f is string => typeof f === "string").slice(0, 12) : [],
    recruiting: p.recruiting === "OPEN" || p.recruiting === "INVITE_ONLY" ? p.recruiting : "CLOSED",
    requirements: str(p.requirements, 800),
    applyUrl: optStr(p.applyUrl, 400),
  });
  revalidatePath(`/dashboard/${guildId}/clan-profile`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

/** The person asking proves they lead the clan. */
export async function verifyClanProfileAction(guildId: string): Promise<Result> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  const result = await adminApi.verifyClanProfile(guild);
  revalidatePath(`/dashboard/${guildId}/clan-profile`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
