/**
 * The "plugin knew it first" link check (bot T-170, LINK-SYSTEM.md section 12.1), as the link service describes it: per link under
 * `verify.xp_first_seen`, and service-wide under the owner overview's `verify.xp_first_seen`. Counts and times only, never XP values.
 */

export const XP_CHECK = "xp_first_seen";

export type VerifyState = "off" | "not_started" | "waiting" | "idle" | "corroborated" | "unknown";

export interface VerifyDetail {
  enabled: boolean;
  state: VerifyState;
  matches: number;
  misses: number;
  needed: number;
  waiting: number;
  refusedPublic: number;
  nextCheckAt: string | null;
  lastReportAt: string | null;
  lastPublishedAt: string | null;
  corroboratedAt: string | null;
}

export interface VerifyOverview {
  enabled: boolean;
  minMatches: number;
  minGainXp: number;
  checksPerLinkPerDay: number;
  checksPerMinute: number;
  totals: Record<string, number>;
  budgetRefusals: number;
  failedReads: number;
  recent: { linkId: string; matches: number; misses: number; corroboratedAt: string }[];
}

/** Per-verifier details keyed by method, as the bot sends them. */
export type VerifyByMethod = Record<string, VerifyDetail | undefined>;

export type Tone = "good" | "warn" | "muted";

/**
 * Plain words for one link's check. For the player when `forOwner` is false (what to expect, no jargon), for the owner when true
 * (the numbers). Null when there is nothing to say (the check is off and the link isn't confirmed).
 */
export function verifyWords(verification: string | undefined, detail: VerifyDetail | undefined, forOwner = false): { tone: Tone; text: string } | null {
  const confirmed = verification === "public_data_corroborated" || detail?.state === "corroborated";
  if (confirmed) {
    const when = detail?.corroboratedAt ? ` on ${detail.corroboratedAt.slice(0, 10)}` : "";
    return {
      tone: "good",
      text: forOwner
        ? `Corroborated${when}: ${detail?.matches ?? "?"} matches, ${detail?.misses ?? 0} misses.`
        : `Confirmed${when}: your game knew your XP before the Hiscores did, so this link was made from your own game.`,
    };
  }
  if (!detail || !detail.enabled || detail.state === "off") return null;
  if (detail.state === "waiting") {
    return {
      tone: "warn",
      text: forOwner
        ? `Checking: ${detail.matches} of ${detail.needed} matches, ${detail.misses} misses, ${detail.waiting} waiting${detail.nextCheckAt ? `, next check ${detail.nextCheckAt.slice(0, 16).replace("T", " ")} UTC` : ""}.`
        : `Being confirmed: ${detail.matches} of ${detail.needed} checks done. The next check happens after you log out or go to the lobby.`,
    };
  }
  return {
    tone: "muted",
    text: forOwner
      ? `Not confirmed yet (${detail.state.replace(/_/g, " ")}): ${detail.matches} matches, ${detail.misses} misses.`
      : "Not confirmed yet. Play with RS Link switched on and log out as usual; it happens by itself after a session or two in which you gain XP.",
  };
}
