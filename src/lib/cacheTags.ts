/**
 * Cache tags for what the site fetches from the bot, so the bot can say "this changed" the moment it does instead of the pages waiting for
 * their timers (the `revalidate` seconds stay as the fallback). The bot sends tags to `POST /api/revalidate`; the names are documented in
 * the bot repository's docs/SITE-INVALIDATION.md and must stay in step with its `SiteInvalidator`.
 *
 * - `site:<name>`: a clan-site read, `<name>` being the first segment of the bot's `/internal/site/<name>` path
 *   (members, overview, member, leaderboard, events, polls, signups, news, options, online, feed, ...).
 * - `hub:clans`, `hub:events`, `hub:leaderboards`: the clans hub's directory reads.
 */

const TAG = /^(site|hub):[a-z0-9-]{1,40}$/;

/** True for a tag this site may be asked to revalidate (the endpoint refuses anything else). */
export function isKnownTagShape(tag: string): boolean {
  return TAG.test(tag);
}

/** The tag of one `/internal/site/<path>` read: `members` -> `site:members`, `member/skill?rsn=x` -> `site:member`. */
export function siteTag(path: string): string {
  const name = path.split(/[?/]/)[0].toLowerCase().replace(/[^a-z0-9-]/g, "");
  return `site:${name || "other"}`;
}

/** The tags of one bot read made through `botCall` (the hub's directory reads); none for anything else. */
export function tagsForInternalPath(path: string): string[] {
  const clean = path.split("?")[0];
  if (!clean.startsWith("/internal/directory/")) return [];
  const rest = clean.slice("/internal/directory/".length).split("/");
  if (rest[0] === "leaderboards") return ["hub:leaderboards"];
  if (rest[0] === "events") return ["hub:events"];
  if (rest[0] === "clans") return rest[2] === "events" ? ["hub:events", "hub:clans"] : ["hub:clans"];
  return [];
}
