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
  /** Their clan profile, when they have a linked, current-member RuneScape name and haven't opted out of being linked. */
  rsn: string | null;
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

export type ActivityKind = "LEVEL_UP" | "XP_MILESTONE" | "QUEST" | "BOSS" | "DROP" | "PET" | "CITADEL_CAP" | "CLUE" | "CHALLENGE";

export interface FeedItem {
  rsn: string;
  kind: ActivityKind;
  text: string;
  details: string;
  date: string;
  recordedAt: string;
}

export interface Records {
  biggestDays: { rsn: string; date: string; xp: number }[];
  twoHundredClub: { rsn: string; skills: number }[];
  capStreaks: { rsn: string; longest: number; current: number }[];
  veterans: { rsn: string; joined: string; joinedExact: boolean }[];
}

export interface CitadelGrid {
  weeks: string[];
  /** Per week: 0 nothing, 1 visited, 2 capped. */
  members: { rsn: string; weeks: number[] }[];
}

export interface ClanHistory {
  memberCount: { date: string; members: number }[];
  timeline: { type: "JOIN" | "LEAVE" | "RENAME"; rsn: string; from: string | null; at: string }[];
  ranks: RankInfo[];
  closeToPromotion: { rsn: string; rank: string; next: string; points: number; needed: number; promotionNeeded: boolean }[];
}

export interface NewsEmbed {
  title: string | null;
  description: string | null;
  url: string | null;
  color: number;
  image: string | null;
  thumbnail: string | null;
  author: string | null;
  footer: string | null;
  fields: { name: string; value: string; inline: boolean }[];
}

export interface NewsPost {
  id: string;
  channel: string;
  author: string;
  avatarUrl: string;
  postedAt: string;
  editedAt: string | null;
  text: string;
  images: string[];
  embeds: NewsEmbed[];
  pinned: boolean;
  url: string;
}

export interface PollSummary {
  id: string;
  title: string;
  active: boolean;
  status: string;
  anonymous: boolean;
  multiple: boolean;
  totalVotes: number;
  createdAt: string;
  closedAt: string | null;
  /** When an open poll will close by itself, if it was given an end time. */
  closesAt: string | null;
  url: string | null;
  options: { number: number; label: string; votes: number }[];
}

export interface SignupSheet {
  id: string;
  title: string;
  note: string | null;
  max: number | null;
  type: "QUEUE" | "GROUP" | "SUBMISSION";
  paused: boolean;
  createdAt: string;
  /** For a submission signup, the questions members answer. */
  fields: { label: string; type: "TEXT" | "LINK" | "IMAGE"; required: boolean }[];
  entries: { name: string; position: number }[];
}

export interface Pvm {
  totalKills: number;
  bosses: { boss: string; total: number; killers: { rsn: string; kills: number }[] }[];
  topKillers: { rsn: string; kills: number }[];
}

export interface Drops {
  total: number;
  recent: { rsn: string; item: string; date: string; recordedAt: string }[];
  topItems: { item: string; count: number }[];
}

export interface MemberProfile extends RosterMember {
  bio: string;
  accentColor: string | null;
  pinnedSkill: number | null;
  adventureLogHidden: boolean;
  firstSeen: string;
  lastPolled: string | null;
  questsComplete: number | null;
  nextRank: { name: string; threshold: number; pointsNeeded: number } | null;
  skills: { id: number; name: string; level: number; xp: number; rank: number; xpToNext: number; xpTo99: number; xpTo120: number }[];
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

export interface Recap {
  scope: "clan" | "member";
  period: { token: string; label: string; from: string; to: string; toDate: boolean; days: number };
  subject: { name: string; memberCount?: number; rank?: string; joined?: string; totalLevel?: number | null; totalXp?: number };
  xp: {
    total: number;
    series: { date: string; xp: number }[];
    bySeriesUnit: "day" | "week";
    bestDay: { date: string; xp: number } | null;
    activeDays: number;
    perDay: number;
    busiestWeekday: string | null;
  };
  skills: { skillId: number; skill: string; xp: number }[];
  activity:
    | { hidden: true }
    | {
        hidden: false;
        bossKills: number;
        topBosses: { boss: string; kills: number }[];
        drops: number;
        topDrops: { item: string; count: number }[];
        levelUps: number;
        quests: number;
        xpMilestones: number;
        twoHundredM: number;
        caps: number;
      };
  citadel: { capsRecorded: number; capWeeks?: number; topCappers?: { rsn: string; weeksCapped: number; totalCaps: number }[]; weeksCapped?: number; longestStreak?: number };
  points: number;
  // clan only
  activeMembers?: number;
  topGainers?: { rsn: string; xp: number }[];
  topKillers?: { rsn: string; kills: number }[];
  roster?: { joined: number; left: number; newMembers: string[] };
  // member only
  levels?: { start: number | null; end: number | null; gained: number | null };
  ranking?: { inRankings: boolean; rank: number | null; outOf: number; clanAveragePerMember: number; shareOfClan: number; topPercent: number | null };
}

/** The periods the recap pages and the Discord command offer, in the order they're listed. */
export const RECAP_PERIODS = [
  { token: "week", label: "This week" },
  { token: "last-week", label: "Last week" },
  { token: "month", label: "This month" },
  { token: "last-month", label: "Last month" },
  { token: "year", label: "This year" },
  { token: "last-year", label: "Last year" },
  { token: "all", label: "All time" },
] as const;

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
export async function getFeed(limit = 40, kind?: string): Promise<FeedItem[] | null> {
  const data = await getSite<{ items: FeedItem[] }>(`feed?limit=${limit}${kind ? `&kind=${encodeURIComponent(kind)}` : ""}`, 30);
  return data?.items ?? null;
}
export const getRecords = () => getSite<Records>("records", 300);
export const getCitadelGrid = (weeks = 12) => getSite<CitadelGrid>(`citadel-grid?weeks=${weeks}`, 300);
export const getHistory = () => getSite<ClanHistory>("history", 300);
export async function getPolls(): Promise<PollSummary[] | null> {
  const data = await getSite<{ polls: PollSummary[] }>("polls", 60);
  return data?.polls ?? null;
}
export async function getSignups(): Promise<SignupSheet[] | null> {
  const data = await getSite<{ signups: SignupSheet[] }>("signups", 30);
  return data?.signups ?? null;
}
export async function getNews(): Promise<NewsPost[] | null> {
  const data = await getSite<{ posts: NewsPost[] }>("news", 60);
  return data?.posts ?? null;
}
export const getRecap = (scope: "clan" | "member", period: string, rsn?: string) =>
  getSite<Recap>(`recap?scope=${scope}&period=${encodeURIComponent(period)}${rsn ? `&rsn=${encodeURIComponent(rsn)}` : ""}`, 300);
export const getPvm = () => getSite<Pvm>("pvm", 300);
export const getDrops = () => getSite<Drops>("drops", 300);
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

/**
 * Adventure-log text with whole-million numbers shortened: "200000000XP in Attack" → "200M XP in Attack".
 * XP milestones past 99 come in whole millions; any other number is left exactly as it was.
 */
export function shortNumbers(text: string): string {
  return text.replace(/(?<![\d,])(\d{1,3}(?:,\d{3}){2,}|\d{7,})(XP)?/g, (match, digits: string, xp?: string) => {
    const value = Number(digits.replace(/,/g, ""));
    return value % 1_000_000 === 0 ? `${value / 1_000_000}M${xp ? " XP" : ""}` : match;
  });
}

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

/** The skill id → name list, matching the bot's catalogue (RuneScape 3 order). */
export const SKILL_NAMES = [
  "Attack", "Defence", "Strength", "Constitution", "Ranged", "Prayer", "Magic", "Cooking", "Woodcutting", "Fletching", "Fishing", "Firemaking",
  "Crafting", "Smithing", "Mining", "Herblore", "Agility", "Thieving", "Slayer", "Farming", "Runecrafting", "Hunter", "Construction", "Summoning",
  "Dungeoneering", "Divination", "Invention", "Archaeology", "Necromancy",
];

/** A friendly estimate of when `xpNeeded` will be reached at `xpPerDay`, or null if there's no pace to go on. */
export function etaLabel(xpNeeded: number, xpPerDay: number): string | null {
  if (xpNeeded <= 0) return "done";
  if (xpPerDay <= 0) return null;
  const days = xpNeeded / xpPerDay;
  if (days < 1) return "within a day";
  if (days < 14) return `~${Math.ceil(days)} days`;
  if (days < 90) return `~${Math.round(days / 7)} weeks`;
  if (days < 730) return `~${Math.round(days / 30)} months`;
  return "over 2 years";
}

/**
 * A link that opens in the Discord desktop app when it's running, falling back to the web page. `path` is
 * everything after discord.com/ — e.g. `events/<guild>/<event>` or `channels/<guild>/<channel>/<message>`.
 */
export const discordWebUrl = (path: string) => `https://discord.com/${path}`;
export const discordAppUrl = (path: string) => `discord://-/${path}`;
export const discordPath = (url: string) => url.replace("https://discord.com/", "");

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
