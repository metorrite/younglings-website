"use server";

import { requireEventAccess } from "@/lib/dashboard";
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
  /^events\/\d{1,18}\/(status|objectives|teams|participants|progress|standings|claims|prizes|awards|signup|bingo|board|organisers|archive|look)$/,
  /^events\/\d{1,18}\/signup\/(sync|close|reopen)$/,
  /^events\/\d{1,18}\/roster\/confirm$/,
  // barring a player from the event (removes them too) and lifting it
  /^events\/\d{1,18}\/bans$/,
  /^events\/\d{1,18}\/bans\/\d{1,20}$/,
  /^events\/\d{1,18}\/participants\/\d{1,20}\/(verification|rating)$/,
  /^events\/\d{1,18}\/teams\/(assign|suggest|finalise|reopen)$/,
  /^events\/\d{1,18}\/(teams|participants)\/\d{1,20}$/,
  // the event's roles and channels: where they stand, the choices, a preview of choices not yet saved, and setting them up, putting role holders right and removing them
  /^events\/\d{1,18}\/space$/,
  /^events\/\d{1,18}\/space\/(settings|preview|apply|remove|sync)$/,
  // wrapping an event up once it is over: where it stands, the settings, locking, taking the roles back, archiving, compressing, exporting and deleting
  /^events\/\d{1,18}\/wrapup$/,
  /^events\/\d{1,18}\/wrapup\/(settings|lock|unlock|roles|archive|compress|export|delete)$/,
  /^events\/\d{1,18}\/wrapup\/export\/file$/,
  /^events\/\d{1,18}\/participants\/\d{1,20}\/buyin$/,
  /^events\/\d{1,18}\/claims\/\d{1,20}\/(approve|deny)$/,
  /^events\/\d{1,18}\/awards\/\d{1,20}\/status$/,
  // setting an event up: the options of a kind, the standard and full creates, unfinished setups, and saved templates
  /^events\/setup\/schema\/[a-z][a-z-]{0,40}$/,
  /^events\/setup\/(standard|create)$/,
  /^events\/drafts$/,
  /^events\/drafts\/\d{1,18}$/,
  /^events\/drafts\/\d{1,18}\/create$/,
  /^events\/saved-templates$/,
  /^events\/saved-templates\/\d{1,18}$/,
  /^events\/saved-templates\/\d{1,18}\/create$/,
  // the server's own defaults for new events (names, look, verification, setup steps)
  /^events\/defaults$/,
  // co-hosted events (T-219): the host's co-hosts, and this server's invitations and the events it co-hosts
  /^events\/\d{1,18}\/cohosts$/,
  /^events\/\d{1,18}\/cohosts\/\d{1,20}$/,
  /^cohost-events$/,
  /^cohost-events\/\d{1,18}\/(accept|decline)$/,
  /^cohost-events\/\d{1,18}\/players\/\d{1,20}$/,
];

export async function eventApiAction(
  guildId: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<WelcomeActionResult<unknown>> {
  const guild = await requireEventAccess(guildId);
  if (!["GET", "POST", "PUT", "DELETE"].includes(method) || typeof path !== "string" || !ALLOWED.some((re) => re.test(path)))
    return { ok: false, error: "That isn't something the event manager can do.", problems: [] };
  if (method !== "GET") {
    const slow = throttle(guild.actorId, "admin");
    if (slow) return { ok: false, error: slow, problems: [] };
  }
  const result = await adminApi.eventsCall(guild, method, path, body && typeof body === "object" ? body : undefined);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
