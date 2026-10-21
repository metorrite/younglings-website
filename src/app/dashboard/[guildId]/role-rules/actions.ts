"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type RoleRule, type RoleRuleList } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Server Actions for connected and trigger role rules. Each begins with `requireGuild(guildId)`; the bot then insists on an Admin, refuses the clan role
 * sync's roles and staff permission roles as targets, and refuses any set of rules that would loop. Saving a rule changes nobody's roles by itself.
 */
export type RuleResult = { ok: true; data: RoleRuleList } | { ok: false; error: string; problems: string[] };

function outcome(result: ApiResult<RoleRuleList>): RuleResult {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^\d{1,20}$/.test(x)).slice(0, 40) : []);

function rule(input: unknown): Omit<RoleRule, "id"> {
  const p = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  return {
    name: typeof p.name === "string" ? p.name.slice(0, 200) : "",
    event: p.event === "LOSES" ? "LOSES" : "GAINS",
    enabled: p.enabled === true,
    when: ids(p.when),
    add: ids(p.add),
    remove: ids(p.remove),
  };
}

export async function saveRoleRuleAction(guildId: string, id: string | null, input: unknown): Promise<RuleResult> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (id !== null && !/^\d{1,20}$/.test(id)) return { ok: false, error: "That rule is gone.", problems: [] };
  const result = id === null ? await adminApi.createRoleRule(guild, rule(input)) : await adminApi.saveRoleRule(guild, id, rule(input));
  revalidatePath(`/dashboard/${guildId}/role-rules`);
  return outcome(result);
}

export async function deleteRoleRuleAction(guildId: string, id: string): Promise<RuleResult> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d{1,20}$/.test(id)) return { ok: false, error: "That rule is gone.", problems: [] };
  const result = await adminApi.deleteRoleRule(guild, id);
  revalidatePath(`/dashboard/${guildId}/role-rules`);
  return outcome(result);
}
