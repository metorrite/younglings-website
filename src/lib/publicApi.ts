import { clientIpFrom } from "@/lib/clientIp";
import { throttle, type LimitKind } from "@/lib/ratelimit";

/**
 * Shared pieces of the public API (`/api/v1/...`): every answer is JSON in the same envelope, GETs can be read from any website and
 * cached by a CDN for a short time, errors always look the same, and callers are rate limited by address. Nothing here ever carries a
 * member's name or Discord identity: the bot only returns what a clan chose to share.
 */
export const API_VERSION = 1;

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

/** A success answer: `{ apiVersion, data }`. Reads are cacheable for 30 seconds (and may be served stale for two minutes while refreshing). */
export function apiJson(data: unknown, status = 200, cacheable = true): Response {
  return new Response(JSON.stringify({ apiVersion: API_VERSION, data }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheable ? "public, s-maxage=30, stale-while-revalidate=120" : "no-store",
      "X-API-Version": String(API_VERSION),
      ...CORS,
    },
  });
}

export function apiError(status: number, message: string, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ apiVersion: API_VERSION, error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-API-Version": String(API_VERSION), ...CORS, ...extra },
  });
}

export const unavailable = () => apiError(503, "JonnyBot is temporarily unavailable. Try again shortly.", { "Retry-After": "30" });

/** Answers a browser's CORS preflight. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}

/** The caller's real address: `CLIENT_IP_HEADER`, else the trusted right-most `X-Forwarded-For` hop (lib/clientIp.ts, T-175). */
export function clientIp(request: Request): string {
  return clientIpFrom(request.headers);
}

/** Takes a token from the caller's bucket; returns a 429 response when they are going too fast, otherwise `null`. */
export function limited(request: Request, kind: LimitKind): Response | null {
  const message = throttle(clientIp(request), kind);
  return message ? apiError(429, "Too many requests. Slow down a little.", { "Retry-After": "5" }) : null;
}
