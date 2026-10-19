import { botCall } from "@/lib/botCall";
import { demoAlliance, demoClan, demoClanEvents, demoClans, demoEvents, demoLeaderboard } from "@/lib/clansHubDemo";

/**
 * What the clans hub shows, read straight from JonnyBot's public directory (the same data the public API serves). Server-only: it carries
 * the bot's shared secret through botCall. Every fetcher returns `null` when the bot can't be reached, so a page can say so instead of failing.
 */
export interface ClanSummary {
  slug: string;
  name: string;
  tagline: string;
  logoUrl: string | null;
  colour: number | null;
  focus: { key: string; label: string }[];
  recruiting: { key: "OPEN" | "INVITE_ONLY" | "CLOSED"; label: string };
  clanName: string | null;
  verified: boolean;
  listed: boolean;
  memberCount: number | null;
  onLeaderboards: boolean;
}

/**
 * What a clan's page says about its alliances. Missing (or null) means the clan chose to say nothing, so show nothing at all. `NONE` is "No allies",
 * whatever is true: it is also what a clan that shows its alliances gets when every ally has chosen to stay hidden. `LIST` carries the allies, grouped by
 * alliance; the bot only ever names clans that chose to be shown, so a page never has to hide anyone itself.
 */
export interface ClanAlliances {
  mode: "NONE" | "LIST";
  alliances: { id: string; name: string; hasPage: boolean; clans: { slug: string; name: string; logoUrl: string | null; colour: number | null }[] }[];
}

export interface ClanDetail extends ClanSummary {
  description: string;
  requirements: string;
  applyUrl: string | null;
  timezone: string | null;
  updatedAt: string | null;
  alliances?: ClanAlliances | null;
}

/** An alliance's public page: only clans that chose to show their alliances are in it. */
export interface AlliancePage {
  id: string;
  name: string;
  clans: { slug: string; name: string; tagline: string; logoUrl: string | null; colour: number | null }[];
}

export interface HubEvent {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  location: string | null;
  status: string;
  startTime: string;
  endTime: string | null;
  interestedCount: number;
  url: string;
  clan?: { slug: string; name: string; logoUrl: string | null; colour: number | null };
}

export interface LeaderboardEntry {
  rank: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  colour: number | null;
  xpGained: number;
  members: number;
  perMember: number;
}

export const FOCUSES: { key: string; label: string }[] = [
  { key: "PVM", label: "PvM" },
  { key: "SKILLING", label: "Skilling" },
  { key: "SOCIAL", label: "Social" },
  { key: "EVENTS", label: "Events" },
  { key: "COMPETITIVE", label: "Competitive" },
  { key: "CASUAL", label: "Casual" },
  { key: "IRONMAN", label: "Ironman" },
  { key: "NEW_PLAYERS", label: "New player friendly" },
];

export const RECRUITING: { key: string; label: string }[] = [
  { key: "OPEN", label: "Recruiting" },
  { key: "INVITE_ONLY", label: "Invite only" },
  { key: "CLOSED", label: "Not recruiting" },
];

/** Local review only: `HUB_DEMO=true` fills the hub with made-up clans, events and rankings so a layout can be judged with a full directory. Never set on a real server. */
const demoOn = () => process.env.HUB_DEMO === "true";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function listClans(filter: { q?: string; recruiting?: string; focus?: string } = {}): Promise<ClanSummary[] | null> {
  const answer = demoOn() ? { status: 200, json: { clans: demoClans() } } : await botCall<{ clans?: ClanSummary[] }>("/internal/directory/clans", { revalidate: 30 });
  if (!answer || answer.status !== 200) return null;
  const q = (filter.q ?? "").trim().toLowerCase().slice(0, 60);
  return (answer.json.clans ?? [])
    .filter(
      (c) =>
        (!q || c.name.toLowerCase().includes(q) || c.tagline.toLowerCase().includes(q)) &&
        (!filter.recruiting || c.recruiting.key === filter.recruiting) &&
        (!filter.focus || c.focus.some((f) => f.key === filter.focus)),
    )
    .sort((a, b) => Number(b.listed) - Number(a.listed) || a.name.localeCompare(b.name));
}

/** One clan's profile, or `undefined` when there is no such clan (as opposed to `null`: the bot is unreachable). */
export async function getClan(slug: string): Promise<ClanDetail | null | undefined> {
  if (!SLUG.test(slug) || slug.length > 40) return undefined;
  if (demoOn()) return demoClan(slug);
  const answer = await botCall<ClanDetail>(`/internal/directory/clans/${slug}`, { revalidate: 30 });
  if (!answer) return null;
  if (answer.status === 404) return undefined;
  return answer.status === 200 ? answer.json : null;
}

/** An alliance's public page, or `undefined` when there is none (it does not exist, or fewer than two of its clans show their alliances), `null` when the bot is unreachable. */
export async function getAlliance(id: string): Promise<AlliancePage | null | undefined> {
  if (!/^\d{1,18}$/.test(id)) return undefined;
  if (demoOn()) return demoAlliance(id);
  const answer = await botCall<AlliancePage>(`/internal/directory/alliances/${id}`, { revalidate: 30 });
  if (!answer) return null;
  if (answer.status === 404) return undefined;
  return answer.status === 200 ? answer.json : null;
}

export async function clanEvents(slug: string): Promise<HubEvent[]> {
  if (!SLUG.test(slug) || slug.length > 40) return [];
  if (demoOn()) return demoClanEvents(slug);
  const answer = await botCall<{ events?: HubEvent[] }>(`/internal/directory/clans/${slug}/events`, { revalidate: 60 });
  return answer && answer.status === 200 ? (answer.json.events ?? []) : [];
}

export async function allEvents(): Promise<HubEvent[] | null> {
  if (demoOn()) return demoEvents();
  const answer = await botCall<{ events?: HubEvent[] }>("/internal/directory/events", { revalidate: 60 });
  return answer && answer.status === 200 ? (answer.json.events ?? []) : null;
}

export async function leaderboard(period: "week" | "month"): Promise<LeaderboardEntry[] | null> {
  if (demoOn()) return demoLeaderboard(period);
  const answer = await botCall<{ entries?: LeaderboardEntry[] }>(`/internal/directory/leaderboards?period=${period}`, { revalidate: 300 });
  return answer && answer.status === 200 ? (answer.json.entries ?? []) : null;
}

/** A clan's accent colour as CSS, or the site's gold when it hasn't chosen one. */
export function accent(colour: number | null | undefined): string {
  return colour === null || colour === undefined ? "#d4af37" : "#" + (colour >>> 0).toString(16).padStart(6, "0").slice(-6);
}

/**
 * A clan's colour for the hub. A clan that picked one keeps it; one that did not gets a colour made from its slug, so the defaults differ from
 * clan to clan instead of every card being the same gold.
 */
export function clanAccent(clan: { slug?: string; name: string; colour: number | null | undefined }): string {
  if (clan.colour !== null && clan.colour !== undefined) return accent(clan.colour);
  const key = clan.slug ?? clan.name;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  const l = 0.58;
  const c = 0.62 * (1 - Math.abs(2 * l - 1));
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

/** A `#rrggbb` colour as `rgba()` with the given opacity, for tints and glows. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Milliseconds until a moment (negative once it has passed). Kept out of the pages so they stay free of `Date.now()`. */
export const msUntil = (iso: string): number => Date.parse(iso) - Date.now();
