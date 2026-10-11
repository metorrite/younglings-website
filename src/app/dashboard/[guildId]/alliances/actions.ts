"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type AllianceList, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

type Result = Promise<WelcomeActionResult<AllianceList>>;

async function run(guildId: string, call: (guild: Awaited<ReturnType<typeof requireGuild>>) => ReturnType<typeof adminApi.alliances>): Result {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const result = await call(guild);
  revalidatePath(`/dashboard/${guildId}/alliances`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

const validId = (id: string) => /^\d{1,18}$/.test(id);
const invalid = (what: string): Result => Promise.resolve({ ok: false, error: `That isn't a valid ${what}.`, problems: [] });

/** Starts an alliance with this server as its first member. */
export async function createAllianceAction(guildId: string, name: string): Result {
  if (typeof name !== "string") return invalid("name");
  return run(guildId, (g) => adminApi.createAlliance(g, name.slice(0, 80)));
}

/** Invites a clan, by the address it has in the clan directory. */
export async function inviteToAllianceAction(guildId: string, id: string, slug: string): Result {
  if (!validId(id) || typeof slug !== "string") return invalid("alliance");
  return run(guildId, (g) => adminApi.inviteToAlliance(g, id, slug.slice(0, 80)));
}

export async function acceptAllianceAction(guildId: string, id: string): Result {
  if (!validId(id)) return invalid("alliance");
  return run(guildId, (g) => adminApi.acceptAlliance(g, id));
}

/** Leaves an alliance, or declines an invitation to one. */
export async function leaveAllianceAction(guildId: string, id: string): Result {
  if (!validId(id)) return invalid("alliance");
  return run(guildId, (g) => adminApi.leaveAlliance(g, id));
}

/** The founder removes another clan from the alliance. */
export async function removeFromAllianceAction(guildId: string, id: string, clanGuildId: string): Result {
  if (!validId(id) || !/^\d{1,20}$/.test(clanGuildId)) return invalid("alliance");
  return run(guildId, (g) => adminApi.removeFromAlliance(g, id, clanGuildId));
}
