/**
 * The visitor's real address, for rate limits, RS Link's IP rules and the `X-Link-Client-Ip` the hub and the bot limit by (ticket T-175).
 * A client controls the LEFT of `X-Forwarded-For` (proxies append to whatever it sent), so the first entry can't be trusted. The rules,
 * set per deploy:
 *
 * - `CLIENT_IP_HEADER` (e.g. `CF-Connecting-IP` when Cloudflare proxies the site): a header our own edge sets and overwrites. Used when
 *   present; when it's missing (someone reached Railway directly), the rule below applies.
 * - Otherwise the entry `TRUSTED_PROXY_HOPS` from the RIGHT of `X-Forwarded-For` (default 1: the address Railway's edge saw). Anything
 *   a visitor adds sits further left and is ignored.
 * - No forwarding header at all (local dev): `X-Real-IP`, else "unknown".
 *
 * No imports, so `node --test` can load it.
 */

type HeaderSource = { get(name: string): string | null };
type Env = Record<string, string | undefined>;

const HEADER_NAME = /^[A-Za-z0-9-]{1,64}$/;

export function clientIpFrom(headers: HeaderSource, env: Env = process.env): string {
  const named = (env.CLIENT_IP_HEADER ?? "").trim();
  if (named && HEADER_NAME.test(named)) {
    const value = headers.get(named)?.split(",")[0]?.trim();
    if (value) return value;
  }
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    const trusted = Number.parseInt(env.TRUSTED_PROXY_HOPS ?? "", 10);
    const fromRight = Number.isInteger(trusted) && trusted >= 1 ? trusted : 1;
    if (hops.length) return hops[Math.max(0, hops.length - fromRight)];
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
