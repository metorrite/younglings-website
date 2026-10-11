import { botCall } from "@/lib/botCall";

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

export interface ClanDetail extends ClanSummary {
  description: string;
  requirements: string;
  applyUrl: string | null;
  timezone: string | null;
  updatedAt: string | null;
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

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function listClans(filter: { q?: string; recruiting?: string; focus?: string } = {}): Promise<ClanSummary[] | null> {
  const answer = await botCall<{ clans?: ClanSummary[] }>("/internal/directory/clans", { revalidate: 30 });
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
  const answer = await botCall<ClanDetail>(`/internal/directory/clans/${slug}`, { revalidate: 30 });
  if (!answer) return null;
  if (answer.status === 404) return undefined;
  return answer.status === 200 ? answer.json : null;
}

export async function clanEvents(slug: string): Promise<HubEvent[]> {
  if (!SLUG.test(slug) || slug.length > 40) return [];
  const answer = await botCall<{ events?: HubEvent[] }>(`/internal/directory/clans/${slug}/events`, { revalidate: 60 });
  return answer && answer.status === 200 ? (answer.json.events ?? []) : [];
}

export async function allEvents(): Promise<HubEvent[] | null> {
  const answer = await botCall<{ events?: HubEvent[] }>("/internal/directory/events", { revalidate: 60 });
  return answer && answer.status === 200 ? (answer.json.events ?? []) : null;
}

export async function leaderboard(period: "week" | "month"): Promise<LeaderboardEntry[] | null> {
  const answer = await botCall<{ entries?: LeaderboardEntry[] }>(`/internal/directory/leaderboards?period=${period}`, { revalidate: 300 });
  return answer && answer.status === 200 ? (answer.json.entries ?? []) : null;
}

/** A clan's accent colour as CSS, or the site's gold when it hasn't chosen one. */
export function accent(colour: number | null | undefined): string {
  return colour === null || colour === undefined ? "#d4af37" : "#" + (colour >>> 0).toString(16).padStart(6, "0").slice(-6);
}
