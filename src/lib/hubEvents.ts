import { botCall } from "@/lib/botCall";

/**
 * The events hub's engine events (T-217, design JonnyBot `docs/EVENTS-HUB.md`), read from the bot's directory (`/internal/directory/hub-events`). Server-only:
 * it carries the bot's shared secret. The viewer is the Discord id of whoever is signed in, from the session (never from the browser), so the bot can show
 * alliance events to members of allied servers and mark a viewer's own servers. Never contains a player's name or Discord id.
 */
export type HubAccess = "PUBLIC" | "ALLIANCE" | "MINE";

export interface HubEngineEvent {
  id: string;
  name: string;
  template: string;
  templateLabel: string;
  status: "SIGNUPS" | "RUNNING" | "SCORING" | "DONE";
  scope: "ALLIANCE" | "PUBLIC";
  scoringMode: "INDIVIDUAL" | "TEAM";
  startsAt: string | null;
  endsAt: string | null;
  signupsOpen: boolean;
  players: number;
  maxParticipants: number;
  summary: string;
  needsRsn: boolean;
  access: HubAccess;
  /** Named by its listed clan profile, else its server's name; never by a Discord id (the hub is public). */
  host: { name: string; iconUrl: string | null; slug: string | null; inviteUrl: string | null };
}

export interface HubEngineEventDetail extends HubEngineEvent {
  description: string;
  prizes: { place: number; placeTo: number; kind: string; description: string; amount: number }[];
  standings?: { rank: number; name: string; points: number }[];
  /** A clan-vs-clan event (T-222): its standings are the clans', by name. */
  clanVsClan?: boolean;
}

/** Whether the events hub's engine events are switched on (`EVENTS_HUB=true`); off by default. */
export function eventsHubOn(): boolean {
  return process.env.EVENTS_HUB === "true";
}

const viewerQuery = (viewer: string | null) => (viewer && /^\d{1,20}$/.test(viewer) ? `?viewer=${viewer}` : "");

export async function hubEngineEvents(viewer: string | null): Promise<HubEngineEvent[] | null> {
  const answer = await botCall<{ events?: HubEngineEvent[] }>(`/internal/directory/hub-events${viewerQuery(viewer)}`);
  return answer && answer.status === 200 ? (answer.json.events ?? []) : null;
}

/** One event, `undefined` when there is no such event for this viewer, `null` when the bot can't be reached. */
export async function hubEngineEvent(id: string, viewer: string | null): Promise<HubEngineEventDetail | null | undefined> {
  if (!/^\d{1,18}$/.test(id)) return undefined;
  const answer = await botCall<HubEngineEventDetail>(`/internal/directory/hub-events/${id}${viewerQuery(viewer)}`);
  if (!answer) return null;
  if (answer.status === 404) return undefined;
  return answer.status === 200 ? answer.json : null;
}

export type HubJoinResult = { ok: true; waiting: boolean; position: number } | { ok: false; error: string; notInServer?: boolean; inviteUrl?: string | null };

/** Joins as `userId` (the signed-in person, taken from the session by the caller). */
export async function joinHubEvent(id: string, userId: string): Promise<HubJoinResult> {
  if (!/^\d{1,18}$/.test(id) || !/^\d{1,20}$/.test(userId)) return { ok: false, error: "That isn't a valid event." };
  const answer = await botCall<{ waiting?: boolean; position?: number; error?: string; notInServer?: boolean; inviteUrl?: string | null }>(`/internal/directory/hub-events/${id}/join`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  if (!answer) return { ok: false, error: "JonnyBot isn't reachable right now." };
  if (answer.status === 200) return { ok: true, waiting: answer.json.waiting === true, position: answer.json.position ?? 0 };
  return { ok: false, error: answer.json.error ?? "That didn't work.", notInServer: answer.json.notInServer === true, inviteUrl: answer.json.inviteUrl ?? null };
}

/** A Discord invite the hub may link to: only discord.gg or discord.com/invite addresses (the bot checks too, but a link on a public page is checked twice). */
export function safeInvite(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https:\/\/(discord\.gg|(www\.)?discord\.com\/invite)\/[A-Za-z0-9-]{2,32}\/?$/.test(url) ? url : null;
}
