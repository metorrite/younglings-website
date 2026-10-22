import type { NextRequest } from "next/server";
import { botCall } from "@/lib/botCall";
import { hubBaseUrl, hubCall, hubLinkPath } from "@/lib/hub";
import { clientIp } from "@/lib/publicApi";
import { throttle } from "@/lib/ratelimit";
import { linkEnabled } from "@/lib/rslink/config";

/**
 * The RS Link plugin's API (LINK-SYSTEM.md section 5.1), as a thin proxy: the bot's port isn't public, so the plugin calls this site
 * (`<LINK_PUBLIC_BASE_URL>/v1/...`, or `/api/link/v1/...` on any host) and it is forwarded to the bot's `/internal/rsnlink/v1/...` with the
 * client IP. Only the routes the plugin uses pass; a coarse per-address limit applies here and the real limits at the bot. Nothing is
 * logged, and the answer is passed through as it is (status and JSON), never cached.
 */

export const dynamic = "force-dynamic";

const POST_ROUTES = new Set(["pair/start", "pair/poll", "pair/dm", "pair/dm/confirm", "session", "xp", "alias", "unlink", "forget-me"]);
const TOKEN = /^lnk_[A-Za-z0-9_-]{43}$/;
const MAX_BODY = 8 * 1024;

type Ctx = { params: Promise<{ path: string[] }> };

function answer(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra } });
}

function refused(request: Request): Response | null {
  if (!linkEnabled()) return answer(404, { error: "not_found", message: "Not found." });
  if (throttle(clientIp(request), "linkPlugin")) return answer(429, { error: "rate_limited", message: "Too many tries. Wait a little and try again.", retryAfter: 5 }, { "Retry-After": "5" });
  return null;
}

async function forward(request: Request, route: string, method: "GET" | "POST", body?: string): Promise<Response> {
  const headers: Record<string, string> = { "X-Link-Client-Ip": clientIp(request) };
  const auth = /^Bearer\s+(\S+)$/i.exec((request.headers.get("authorization") ?? "").trim());
  if (auth && TOKEN.test(auth[1])) headers.Authorization = `Bearer ${auth[1]}`;
  // With HUB_BASE_URL set, the RuneClans hub answers instead of the bot (lib/hub.ts); same routes, same answers.
  const hubPath = hubBaseUrl() ? hubLinkPath(`v1/${route}`) : null;
  const bot = hubPath
    ? await hubCall<Record<string, unknown>>(hubPath, { method, headers, body })
    : await botCall<Record<string, unknown>>(`/internal/rsnlink/v1/${route}`, { method, headers, body });
  if (!bot) return answer(503, { error: "unavailable", message: "Linking isn't available right now. Try again in a minute.", retryAfter: 30 }, { "Retry-After": "30" });
  const extra: Record<string, string> = {};
  const retry = bot.json.retryAfter;
  if (typeof retry === "number") extra["Retry-After"] = String(retry);
  return answer(bot.status, bot.json, extra);
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const route = (await params).path.join("/");
  const stop = refused(request);
  if (stop) return stop;
  if (route !== "keys") return answer(404, { error: "not_found", message: "Not found." });
  return forward(request, route, "GET");
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const route = (await params).path.join("/");
  const stop = refused(request);
  if (stop) return stop;
  if (!POST_ROUTES.has(route)) return answer(404, { error: "not_found", message: "Not found." });
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY) return answer(413, { error: "too_large", message: "That request is too large." });
  const body = await request.text();
  if (body.length > MAX_BODY) return answer(413, { error: "too_large", message: "That request is too large." });
  return forward(request, route, "POST", body.trim() ? body : "{}");
}
