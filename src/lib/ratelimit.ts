/**
 * A small token-bucket limiter for Server Actions, keyed by who is acting and what they're doing.
 *
 * It is the website's first line of defence against button-mashing: a few quick clicks go through, a sustained
 * flood is turned away here without ever reaching JonnyBot. The bot applies its own limits as well (this is
 * only per website instance, in memory — a restart gives everyone a fresh bucket), so neither side has to trust
 * the other.
 */

interface Bucket {
  tokens: number;
  updatedAt: number;
}

interface Rule {
  /** Actions allowed in a burst. */
  capacity: number;
  /** Milliseconds to earn one more action back. */
  refillMs: number;
}

const RULES = {
  vote: { capacity: 5, refillMs: 1500 },
  signup: { capacity: 5, refillMs: 2000 },
  profile: { capacity: 8, refillMs: 1500 },
  admin: { capacity: 15, refillMs: 1000 },
} satisfies Record<string, Rule>;

export type LimitKind = keyof typeof RULES;

const buckets = new Map<string, Bucket>();
const SWEEP_AT = 5000;

/** Takes a token. Returns a friendly message if the person is going too fast, or `null` if the action may proceed. */
export function throttle(userId: string, kind: LimitKind, now = Date.now()): string | null {
  const rule: Rule = RULES[kind];
  const key = `${kind}:${userId}`;

  if (buckets.size > SWEEP_AT) {
    for (const [k, b] of buckets) if (now - b.updatedAt > 60_000) buckets.delete(k);
  }

  const bucket = buckets.get(key) ?? { tokens: rule.capacity, updatedAt: now };
  bucket.tokens = Math.min(rule.capacity, bucket.tokens + (now - bucket.updatedAt) / rule.refillMs);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return "You're doing that too fast — give it a moment and try again.";
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return null;
}
