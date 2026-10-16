"use server";

import { requireGuild } from "@/lib/dashboard";
import { adminApi, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * The event manager's one doorway to the bot's event routes. Only the shapes the manager uses are allowed (events, events/{id}, and the
 * known pieces under it), so a crafted path can't reach anything else; the bot checks every rule again. Like every dashboard action it
 * starts by checking the user against *that* server.
 */
const ALLOWED = [
  /^events$/,
  /^events\/templates$/,
  /^events\/(bingo-catalog|archive-finished)$/,
  /^events\/\d{1,18}$/,
  /^events\/\d{1,18}\/(status|objectives|teams|participants|progress|standings|claims|prizes|awards|signup|bingo|board|organisers|archive)$/,
  /^events\/\d{1,18}\/signup\/(sync|close|reopen)$/,
  /^events\/\d{1,18}\/roster\/confirm$/,
  /^events\/\d{1,18}\/participants\/\d{1,20}\/verification$/,
  /^events\/\d{1,18}\/(teams|participants)\/\d{1,20}$/,
  /^events\/\d{1,18}\/participants\/\d{1,20}\/buyin$/,
  /^events\/\d{1,18}\/claims\/\d{1,20}\/(approve|deny)$/,
  /^events\/\d{1,18}\/awards\/\d{1,20}\/status$/,
];

export async function eventApiAction(
  guildId: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<WelcomeActionResult<unknown>> {
  const guild = await requireGuild(guildId);
  if (!["GET", "POST", "PUT", "DELETE"].includes(method) || typeof path !== "string" || !ALLOWED.some((re) => re.test(path)))
    return { ok: false, error: "That isn't something the event manager can do.", problems: [] };
  if (method !== "GET") {
    const slow = throttle(guild.actorId, "admin");
    if (slow) return { ok: false, error: slow, problems: [] };
  }
  const result = await adminApi.eventsCall(guild, method, path, body && typeof body === "object" ? body : undefined);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
