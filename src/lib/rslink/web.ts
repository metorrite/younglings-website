import { NextResponse, type NextRequest } from "next/server";
import { botCall } from "@/lib/botCall";
import { hubBaseUrl, hubCall, hubLinkPath } from "@/lib/hub";
import { clientIp } from "@/lib/publicApi";
import { throttle } from "@/lib/ratelimit";
import { linkEnabled } from "@/lib/rslink/config";
import { cookieKey, cookieName, MAX_MS, newSession, open, sameSecret, seal, type LinkSession } from "@/lib/rslink/session";

/**
 * Shared pieces of the RS Link page's routes (`/api/link/web/*`). Server only: it reaches the bot with the internal secret.
 *
 * Every POST must come from this site (the browser's Origin header names this host) and, once a session exists, carry its CSRF token in
 * `X-RSLink-CSRF`. The page's session is its own sealed cookie (see session.ts); the bot is the authority for every linking rule and gets
 * the browser session id, the client IP (for its limits) and, after sign-in, the Discord id from the verified callback.
 */

export const CSRF_HEADER = "x-rslink-csrf";

export interface WebContext {
  key: Buffer;
  secure: boolean;
  /** The current session, or a fresh one when the request had none (it is saved with the answer). */
  session: LinkSession;
  fresh: boolean;
}

export function isSecure(request: NextRequest): boolean {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  return (proto ?? request.nextUrl.protocol.replace(":", "")) === "https";
}

function requestHost(request: NextRequest): string {
  return (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
}

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function problem(status: number, error: string, message: string, extra: Record<string, unknown> = {}): NextResponse {
  return json({ error, message, ...extra }, status);
}

/**
 * Checks the face is on, the key is set, the per-IP limit, and for a POST the origin and (when a session exists) the CSRF token. Returns
 * the context, or the error answer to send.
 */
export function guard(request: NextRequest, { post, needSession = false }: { post: boolean; needSession?: boolean }): WebContext | NextResponse {
  if (!linkEnabled()) return problem(404, "not_found", "Not found.");
  const key = cookieKey();
  if (!key) return problem(503, "link_off", "Linking isn't available right now.");
  if (throttle(clientIp(request), "link")) return problem(429, "rate_limited", "Too many tries. Wait a little and try again.", { retryAfter: 5 });

  const secure = isSecure(request);
  const existing = open(request.cookies.get(cookieName(secure))?.value, key);
  if (post) {
    const origin = request.headers.get("origin");
    let originHost = "";
    try {
      originHost = origin ? new URL(origin).host.toLowerCase() : "";
    } catch {
      originHost = "";
    }
    if (!originHost || originHost !== requestHost(request)) return problem(403, "bad_origin", "Open the link page again and retry.");
    if (existing && !sameSecret(request.headers.get(CSRF_HEADER), existing.csrf)) return problem(403, "bad_csrf", "Your page is out of date. Reload it and try again.");
  }
  if (needSession && !existing) return problem(401, "no_session", "Your session has ended. Open the page again.");
  return { key, secure, session: existing ?? newSession(), fresh: !existing };
}

/** Saves the session on an answer (refreshing its idle time), or clears it when `session` is null. */
export function withSession(response: NextResponse, ctx: WebContext, session: LinkSession | null): NextResponse {
  const name = cookieName(ctx.secure);
  if (!session) {
    response.cookies.set(name, "", { httpOnly: true, secure: ctx.secure, sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  }
  const updated = { ...session, seen: Date.now() };
  response.cookies.set(name, seal(updated, ctx.key), {
    httpOnly: true,
    secure: ctx.secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(1, Math.floor((updated.iat + MAX_MS - Date.now()) / 1000)),
  });
  return response;
}

/**
 * Calls the bot's `/internal/rsnlink/<path>` with a JSON body and the client IP, or the same route on the RuneClans hub when `HUB_BASE_URL`
 * is set (lib/hub.ts). Null when it can't be reached.
 */
export async function linkBot(request: NextRequest, path: string, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const init = {
    method: path === "v1/keys" ? "GET" : "POST",
    headers: { "X-Link-Client-Ip": clientIp(request), ...headers },
    body: path === "v1/keys" ? undefined : JSON.stringify(body),
  };
  const hubPath = hubBaseUrl() ? hubLinkPath(path) : null;
  if (hubPath) return hubCall<Record<string, unknown>>(hubPath, init);
  return botCall<Record<string, unknown>>(`/internal/rsnlink/${path}`, init);
}

export const unavailable = () => problem(503, "unavailable", "Linking isn't available right now. Try again in a minute.", { retryAfter: 30 });

/** The bot's answer passed through (status and body), with the session saved. */
export function relay(answer: { status: number; json: Record<string, unknown> } | null, ctx: WebContext, session: LinkSession | null = ctx.session): NextResponse {
  if (!answer) return withSession(unavailable(), ctx, session);
  return withSession(json(answer.json, answer.status), ctx, session);
}
