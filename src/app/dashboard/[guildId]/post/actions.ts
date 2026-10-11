"use server";

import { requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

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
