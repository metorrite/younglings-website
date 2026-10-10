"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type PermissionGroupDraft, type PermissionGroups, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Saves a server's permission groups. Like every dashboard action it starts by checking the signed-in user against *that* server,
 * and the bot then refuses anyone below the Admin tier, so this is no way to promote yourself.
 */

const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^\d{1,20}$/.test(x)) : []);

/** Rebuilds the browser's data field by field, so nothing unexpected is forwarded; the bot checks the roles and names itself. */
function draftsFrom(input: unknown): PermissionGroupDraft[] | null {
  if (!Array.isArray(input)) return null;
  return input.slice(0, 60).map((raw) => {
    const g = (raw ?? {}) as Record<string, unknown>;
    return {
      key: typeof g.key === "string" && /^[a-z0-9]{1,24}$/.test(g.key) ? g.key : null,
      name: typeof g.name === "string" ? g.name.slice(0, 80) : "",
      includeHigher: g.includeHigher === true,
      roleIds: ids(g.roleIds),
    };
  });
}

export async function savePermissionGroupsAction(guildId: string, input: unknown): Promise<WelcomeActionResult<PermissionGroups>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const drafts = draftsFrom(input);
  if (!drafts) return { ok: false, error: "Those groups couldn't be read.", problems: [] };

  const result = await adminApi.savePermissions(guild, drafts);
  revalidatePath(`/dashboard/${guildId}`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
