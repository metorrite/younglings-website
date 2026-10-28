import type { EventDetail, EventPlayer } from "@/lib/eventTypes";

/** The most and fewest a rating can be, and what a player counts as when nothing is known (the same numbers the bot uses). */
export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const UNKNOWN_RATING = 3;

/** A big XP number short: 5,000,000,000 is "5.0B", 250,000,000 is "250M". */
export function shortXp(xp: number): string {
  if (xp >= 1_000_000_000) return `${(xp / 1_000_000_000).toFixed(1)}B`;
  if (xp >= 1_000_000) return `${Math.round(xp / 1_000_000)}M`;
  if (xp >= 1_000) return `${Math.round(xp / 1_000)}K`;
  return String(xp);
}

/** Who is where, worked out from the event: who holds a place and may be put on a team, who is on which team, who can't be yet, and who is waiting. */
export interface Placement {
  /** Active players with no team who may be placed. */
  unassigned: EventPlayer[];
  /** Active players with no team who can't be put on one yet (they haven't passed the verification the event needs). */
  blocked: EventPlayer[];
  /** The waitlist. */
  waiting: EventPlayer[];
  /** Players on each team (by team id). A player on a team who shouldn't be (verification turned down since) stays in their team, flagged by their {@code teamBlock}. */
  byTeam: Map<string, EventPlayer[]>;
}

/**
 * Sorts an event's players into the builder's columns. {@code moves} are tentative placements (a suggestion not yet applied, or a drag the server hasn't
 * answered yet): a player in it is shown on that team (null for none) instead of where the server has them.
 */
export function placement(detail: EventDetail, moves: Record<string, string | null> = {}): Placement {
  const teamIds = new Set(detail.teams.map((t) => t.id));
  const byTeam = new Map<string, EventPlayer[]>(detail.teams.map((t) => [t.id, []]));
  const unassigned: EventPlayer[] = [];
  const blocked: EventPlayer[] = [];
  const waiting: EventPlayer[] = [];
  for (const p of detail.participants) {
    if (p.waiting) {
      waiting.push(p);
      continue;
    }
    const wanted = p.userId in moves ? moves[p.userId] : p.teamId;
    const teamId = wanted !== null && wanted !== undefined && teamIds.has(wanted) ? wanted : null;
    if (teamId !== null) byTeam.get(teamId)?.push(p);
    else if (p.teamBlock) blocked.push(p);
    else unassigned.push(p);
  }
  return { unassigned, blocked, waiting, byTeam };
}

export const ratingOf = (p: EventPlayer): number => p.effectiveRating ?? p.rating ?? p.suggestedRating ?? UNKNOWN_RATING;

/** How a team adds up: its players, their rating total and average. */
export interface TeamTotals {
  players: number;
  rating: number;
  average: number;
}

export function totalsOf(players: EventPlayer[]): TeamTotals {
  const rating = players.reduce((sum, p) => sum + ratingOf(p), 0);
  return { players: players.length, rating, average: players.length === 0 ? 0 : Math.round((rating * 10) / players.length) / 10 };
}

/** Whether a rating comes from an organiser, from the player's stats, or is only a guess. */
export function ratingSource(p: EventPlayer): "set" | "suggested" | "unknown" {
  if (p.rating !== null) return "set";
  if (p.suggestedRating !== null) return "suggested";
  return "unknown";
}

/** The step of the setup checklist about teams, when the event has one. */
export function teamsStep(detail: EventDetail) {
  return detail.prep.steps.find((s) => s.key === "teams") ?? null;
}
