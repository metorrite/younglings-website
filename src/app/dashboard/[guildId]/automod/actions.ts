"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type Automod, type AutomodRule, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const KEYS = ["INVITES", "LINKS", "BLOCKED_WORDS", "CAPS", "MENTIONS", "SPAM", "REPEAT", "EMOJI"] as const;
const ids = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && /^\d{1,20}$/.test(v)).slice(0, 25) : []);

/** Saves a server's automod. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveAutomodAction(guildId: string, input: unknown): Promise<WelcomeActionResult<Automod>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;

  const rules: AutomodRule[] = [];
  for (const item of Array.isArray(p.rules) ? p.rules.slice(0, 20) : []) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const key = KEYS.find((k) => k === r.key);
    if (!key) continue;
    rules.push({
      key,
      label: "",
      enabled: r.enabled === true,
      warn: r.warn === true,
      limit: typeof r.limit === "number" ? Math.trunc(r.limit) : 0,
      seconds: typeof r.seconds === "number" ? Math.trunc(r.seconds) : 0,
      words: Array.isArray(r.words) ? r.words.filter((w): w is string => typeof w === "string").slice(0, 200).map((w) => w.slice(0, 80)) : [],
    });
  }
  const result = await adminApi.saveAutomod(guild, { enabled: p.enabled === true, rules, exemptRoles: ids(p.exemptRoles), exemptChannels: ids(p.exemptChannels) });
  revalidatePath(`/dashboard/${guildId}/automod`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
