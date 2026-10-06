/**
 * Server-side client for JonnyBot's public clan data (`/internal/site/*`): roster, profiles, leaderboards,
 * who's online and events. Everything here is public clan information — Discord identities never come back
 * from the bot — but the calls still go through the shared secret and must stay on the server.
 *
 * Every function returns `null` rather than throwing when the bot isn't reachable, so each page can show a
 * friendly "can't reach JonnyBot" state instead of an error.
 */

// ---------- shapes ----------

export interface OnlineMember {
  id: string;
  displayName: string;
  avatarUrl: string;
  status: "online" | "idle" | "dnd";
  colorRaw: number;
  topRole: string | null;
}

export interface OnlineGroup {
  name: string;
  colorRaw: number;
  count: number;
  members: OnlineMember[];
}

export interface OnlineData {
  total: number;
  groups: OnlineGroup[];
}

export interface SiteEvent {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  location: string | null;
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELED";
  startTime: string;
  endTime: string | null;
  interestedCount: number;
  url: string;
}

export interface RosterMember {
  rsn: string;
  rank: string;
  rankOrder: number;
  totalXp: number;
  kills: number;
  joined: string;
  joinedExact: boolean;
  points: number;
  promotionNeeded: boolean;
  verified: boolean;
  totalLevel: number | null;
  combatLevel: number | null;
}

export interface RankInfo {
  name: string;
  order: number;
  threshold: number;
  count: number;
}

export interface RosterData {
  members: RosterMember[];
  ranks: RankInfo[];
}

export interface RsnValue {
  rsn: string;
  value: number;
}

export interface Overview {
  clan: {
    name: string | null;
    memberCount: number;
    verifiedCount: number;
    totalXp: number;
    totalKills: number;
    averageTotalLevel: number;
    xpToday: number;
    xpWeek: number;
    xpMonth: number;
  };
  ranks: RankInfo[];
  gains: Record<"day" | "week" | "month", { rsn: string; xp: number }[]>;
  citadel: {
    weeks: { weekStart: string; capped: number; visited: number }[];
    topCappers: { rsn: string; weeksCapped: number; totalCaps: number }[];
  };
  roster: { weekStart: string; joins: number; leaves: number }[];
  skillLeaders: { skillId: number; skill: string; leaders: { rsn: string; level: number; xp: number }[] }[];
  topXp: RsnValue[];
  topKills: RsnValue[];
  topLevel: RsnValue[];
  topPoints: RsnValue[];
}

export interface SkillGain {
  skillId: number;
  skill: string;
  xp: number;
}

export interface MemberProfile extends RosterMember {
  firstSeen: string;
  lastPolled: string | null;
  questsComplete: number | null;
  nextRank: { name: string; threshold: number; pointsNeeded: number } | null;
  skills: { id: number; name: string; level: number; xp: number; rank: number }[];
  gains: Record<"day" | "week" | "month", number>;
  skillGains: Record<"day" | "week" | "month", SkillGain[]>;
  history: { date: string; totalXp: number; totalLevel: number }[];
  citadel: { caps: number; visits: number; cappedWeeks: string[] };
  awards: { type: string; points: number; date: string }[];
  activities: { date: string; text: string; details: string }[];
}

export interface SkillSeries {
  skillId: number;
  skill: string;
  history: { date: string; xp: number }[];
}

export interface Leaderboard {
  month: string;
  months: string[];
  totalXp: number;
  gainers: { rsn: string; xp: number }[];
  cappers: { rsn: string; weeksCapped: number; totalCaps: number }[];
  joined: string[];
  left: string[];
}

export interface Coffer {
  donated: number;
  donations: number;
  donors: number;
  held: number;
  giveaways: number;
  givenAway: number;
  weeks: { weekStart: string; donated: number }[];
  topDonors: { name: string; total: number; donations: number }[];
  recentGiveaways: { amount: number; description: string | null; at: string }[];
}

// ---------- fetching ----------

async function getSite<T>(path: string, revalidateSeconds: number): Promise<T | null> {
  const baseUrl = process.env.JONNYBOT_INTERNAL_API_URL;
  const secret = process.env.JONNYBOT_INTERNAL_API_SECRET;
  if (!baseUrl || !secret) return null;

  try {
    const response = await fetch(`${baseUrl}/internal/site/${path}`, {
      headers: { "X-Internal-Secret": secret },
      next: { revalidate: revalidateSeconds },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const getOnline = () => getSite<OnlineData>("online", 30);

export async function getEvents(): Promise<SiteEvent[] | null> {
  const data = await getSite<{ events: SiteEvent[] }>("events", 60);
  return data?.events ?? null;
}

export const getRoster = () => getSite<RosterData>("members", 120);
export const getOverview = () => getSite<Overview>("overview", 120);
export const getSkillSeries = (rsn: string, skillId: number) => getSite<SkillSeries>(`member/skill?rsn=${encodeURIComponent(rsn)}&skill=${skillId}`, 300);
export const getLeaderboard = (month?: string) => getSite<Leaderboard>(`leaderboard${month ? `?month=${encodeURIComponent(month)}` : ""}`, 300);
export const getCoffer = () => getSite<Coffer>("coffer", 120);
/** The RuneScape names linked to a Discord user. Only ever call this with the id from the visitor's own verified session. */
export async function getMyRsns(discordUserId: string): Promise<string[] | null> {
  const data = await getSite<{ rsns: string[] }>(`me?userId=${encodeURIComponent(discordUserId)}`, 30);
  return data?.rsns ?? null;
}
export const getProfile = (rsn: string) => getSite<MemberProfile>(`member?rsn=${encodeURIComponent(rsn)}`, 120);

// ---------- formatting ----------

/** 1.2K / 3.4M / 5.6B — for big XP numbers where precision isn't the point. */
export function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(abs >= 1e10 ? 1 : 2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 1 : 2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
  return String(n);
}

export const full = (n: number) => n.toLocaleString("en-US");

/** A Discord role colour as CSS, or undefined for "no colour" (JDA's sentinel is negative or above 0xFFFFFF). */
export function discordColor(raw: number | undefined | null): string | undefined {
  if (raw === undefined || raw === null || raw <= 0 || raw > 0xffffff) return undefined;
  return `#${raw.toString(16).padStart(6, "0")}`;
}

/** Short fixed-format date ("5 Oct 2026") — rendered on the server, so it never depends on the viewer's locale. */
export function shortDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function shortDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** "2026-09" → "September 2026". */
export function monthLabel(month: string): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? month : d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** A human label for a clan-points award type ("DAILY_MEMBERSHIP" → "Daily membership"). */
export function awardLabel(type: string): string {
  const text = type.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The rank tiers' accent colours, low to high — recruits are plain, owners are gold. */
export function rankColor(order: number, maxOrder: number): string {
  if (maxOrder <= 0) return "#9ca3af";
  const t = Math.max(0, order) / maxOrder;
  if (t >= 0.9) return "#d4af37";
  if (t >= 0.7) return "#e0a24a";
  if (t >= 0.45) return "#8b7cf6";
  if (t >= 0.2) return "#5aa9e6";
  return "#9ca3af";
}
