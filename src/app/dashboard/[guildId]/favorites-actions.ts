"use server";

import { revalidatePath } from "next/cache";
import { NAV_GROUPS } from "@/components/dashboard/shell/nav";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** The pages of the sidebar that can be starred. */
const PAGES = new Set(NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.path && !i.soon).map((i) => i.path as string));

/**
 * Saves the sidebar pages this person starred in this server (in the order they starred them). Like every dashboard action it starts with
 * `requireGuild`; only known pages are passed on, and the bot keeps the list per admin, so nobody can change anyone else's.
 */
export async function setFavoritesAction(guildId: string, paths: unknown): Promise<WelcomeActionResult<{ paths: string[] }>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!Array.isArray(paths) || paths.some((p) => typeof p !== "string")) return { ok: false, error: "That list of pages couldn't be read.", problems: [] };
  const known = (paths as string[]).filter((p) => PAGES.has(p));

  const result = await adminApi.saveFavorites(guild, known);
  revalidatePath(`/dashboard/${guildId}`, "layout");
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
