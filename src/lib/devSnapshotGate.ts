/**
 * Who may see the dev snapshot button: the bot's owner and nobody else. Pure so it can be tested without a bot or a login.
 * Fails closed in every direction: no user, a bot that can't be asked, a bot that doesn't send `isOwner` (an older one) and a
 * person who is not allowed in all mean "no button".
 */

export interface OwnerAnswer {
  ok: boolean;
  data?: { allowed: boolean; tier: string; isOwner?: boolean };
}

export type OwnerLookup = (userId: string) => Promise<OwnerAnswer>;

export interface OwnerDecision {
  owner: boolean;
  tier: string | null;
}

const NO: OwnerDecision = { owner: false, tier: null };
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; decision: OwnerDecision }>();

/** Decides from the bot's answer. A short in-memory cache keeps the extra bot call off most page loads. */
export async function decideOwner(userId: string | undefined | null, lookup: OwnerLookup, now = Date.now()): Promise<OwnerDecision> {
  if (!userId || !/^\d{1,20}$/.test(userId)) return NO;
  const hit = cache.get(userId);
  if (hit && now - hit.at < TTL_MS) return hit.decision;

  let decision = NO;
  try {
    const answer = await lookup(userId);
    const who = answer.ok ? answer.data : undefined;
    if (who && who.allowed && who.tier !== "NONE" && who.isOwner === true) decision = { owner: true, tier: who.tier };
  } catch {
    // an unreachable bot means no button, and is not remembered, so the button comes back as soon as it answers
    return NO;
  }
  if (cache.size > 500) cache.clear();
  cache.set(userId, { at: now, decision });
  return decision;
}

/** Forget what was learned about everyone (tests). */
export function clearOwnerCache() {
  cache.clear();
}
