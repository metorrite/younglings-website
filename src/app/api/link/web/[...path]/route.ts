import { NextResponse, type NextRequest } from "next/server";
import { classifyHost } from "@/lib/siteHosts";
import { discordClient, discordRedirectUri, linkPagePath } from "@/lib/rslink/config";
import { pkceChallenge, randomToken, sameSecret, type LinkSession } from "@/lib/rslink/session";
import { guard, json, linkBot, problem, relay, unavailable, withSession, type WebContext } from "@/lib/rslink/web";
import { hubBaseUrl, hubCall } from "@/lib/hub";

/**
 * The RS Link page's routes (LINK-SYSTEM.md section 5.2), all under `/api/link/web/`:
 *
 * - `GET state`: creates the page's session if needed; answers whether you are signed in, your Discord name, and the CSRF token.
 * - `POST code` {code}: checks a code from the plugin and binds its pairing to this browser. The RSN is only shown after sign-in.
 * - `GET auth/discord?next=confirm|links` and `GET auth/callback`: Discord sign-in (scope `identify` only; state, `iss` and PKCE S256
 *   checked; the access token is used once to read who you are and then dropped).
 * - `GET pairing`, `POST confirm` {decision}: the confirm screen.
 * - `GET links`, `POST unlink` {linkId}, `POST delete-my-data` {confirm: "DELETE"}, `POST signout`.
 * - With the RuneClans hub (`HUB_BASE_URL`, T-163): `GET grant-app?app=`, `GET grants`, `POST grant` {appId, categories, identity},
 *   `POST revoke-grant` {appId}: which bots may see the signed-in player's plugin data. 404 without the hub.
 */

export const dynamic = "force-dynamic";

const DISCORD_AUTHORIZE = "https://discord.com/oauth2/authorize";
const DISCORD_TOKEN = "https://discord.com/api/oauth2/token";
const DISCORD_ME = "https://discord.com/api/users/@me";
const MAX_BODY = 4096;

type Ctx = { params: Promise<{ path: string[] }> };

async function readBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  if (!text.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const APP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CATEGORIES = new Set(["XP", "DROPS", "KILLS", "ACHIEVEMENTS", "PRESENCE"]);

/** A hub call for the grant routes, its answer passed through like the bot's (null when unreachable). */
async function hub(path: string, method: "GET" | "POST" | "PUT", body?: Record<string, unknown>) {
  return hubCall<Record<string, unknown>>(path, { method, body: body ? JSON.stringify(body) : undefined });
}

/** The signed-in player's grants, each with its bot's name (a bot that was suspended shows as no longer active). */
async function grantsOf(discordId: string) {
  const me = await hub("/web/players/me", "POST", { discordId });
  if (!me) return null;
  if (me.status === 404) return { status: 200, json: { grants: [] } };
  if (me.status !== 200) return me;
  const grants = Array.isArray(me.json.grants) ? (me.json.grants as Record<string, unknown>[]) : [];
  const named = await Promise.all(
    grants.map(async (g) => {
      const card = typeof g.appId === "string" && APP_ID.test(g.appId) ? await hub(`/web/apps/${g.appId}`, "GET") : null;
      return { ...g, appName: card && card.status === 200 && typeof card.json.name === "string" ? card.json.name : "A bot that is no longer active" };
    }),
  );
  return { status: 200, json: { grants: named } };
}

/** A page of the face, as an absolute URL on the host the request came to. */
function pageUrl(request: NextRequest, path: string, query = ""): URL {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  const url = new URL(linkPagePath(classifyHost(host) === "link", path) + query, request.nextUrl.origin);
  return url;
}

function signedIn(ctx: WebContext): ctx is WebContext & { session: LinkSession & { did: string } } {
  return typeof ctx.session.did === "string" && /^\d{17,20}$/.test(ctx.session.did);
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const route = (await params).path.join("/");
  const ctx = guard(request, { post: false });
  if (ctx instanceof NextResponse) return ctx;

  switch (route) {
    case "state":
      return withSession(json({ signedIn: signedIn(ctx), discordName: ctx.session.dname ?? null, csrf: ctx.session.csrf }), ctx, ctx.session);

    case "pairing":
      if (!signedIn(ctx)) return withSession(problem(401, "not_signed_in", "Sign in with Discord first."), ctx, ctx.session);
      return relay(await linkBot(request, "web/pairing", { browserSession: ctx.session.sid, discordId: ctx.session.did }), ctx);

    case "links":
      if (!signedIn(ctx)) return withSession(problem(401, "not_signed_in", "Sign in with Discord first."), ctx, ctx.session);
      return relay(await linkBot(request, "web/links", { discordId: ctx.session.did }), ctx);

    case "auth/discord": {
      const client = discordClient();
      if (!client) return withSession(unavailable(), ctx, ctx.session);
      const asked = request.nextUrl.searchParams.get("next");
      const next = asked === "links" ? "links" : asked === "grant" ? "grant" : "confirm";
      const app = request.nextUrl.searchParams.get("app") ?? "";
      const state = randomToken(24);
      const verifier = randomToken(48);
      const session: LinkSession = { ...ctx.session, oauth: { state, verifier, at: Date.now(), next, app: next === "grant" && APP_ID.test(app) ? app : undefined } };
      const url = new URL(DISCORD_AUTHORIZE);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", client.id);
      url.searchParams.set("scope", "identify");
      url.searchParams.set("redirect_uri", discordRedirectUri());
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", pkceChallenge(verifier));
      url.searchParams.set("code_challenge_method", "S256");
      url.searchParams.set("prompt", "none");
      return withSession(NextResponse.redirect(url, 302), ctx, session);
    }

    case "auth/callback":
      return callback(request, ctx);

    case "grant-app": {
      if (!hubBaseUrl()) return problem(404, "not_found", "Not found.");
      const app = request.nextUrl.searchParams.get("app") ?? "";
      if (!APP_ID.test(app)) return withSession(problem(404, "unknown_app", "That bot isn't one this service knows."), ctx, ctx.session);
      return relay(await hub(`/web/apps/${app}`, "GET"), ctx);
    }

    case "grants":
      if (!hubBaseUrl()) return problem(404, "not_found", "Not found.");
      if (!signedIn(ctx)) return withSession(problem(401, "not_signed_in", "Sign in with Discord first."), ctx, ctx.session);
      return relay(await grantsOf(ctx.session.did), ctx);

    default:
      return problem(404, "not_found", "Not found.");
  }
}

/** Discord sends the browser back here. Anything that doesn't match the sign-in this browser started is refused. */
async function callback(request: NextRequest, ctx: WebContext): Promise<NextResponse> {
  const q = request.nextUrl.searchParams;
  const oauth = ctx.session.oauth;
  const back = (next: "confirm" | "links" | "grant" | "home", error?: string) => {
    const query = [next === "grant" && oauth?.app ? `app=${oauth.app}` : "", error ? `error=${error}` : ""].filter(Boolean).join("&");
    return NextResponse.redirect(pageUrl(request, next === "home" ? "/" : `/${next}`, query ? `?${query}` : ""), 302);
  };
  const cleared: LinkSession = { ...ctx.session, oauth: undefined };

  if (!oauth || !sameSecret(q.get("state"), oauth.state)) return withSession(back("home", "signin_expired"), ctx, cleared);
  const iss = q.get("iss");
  if (iss && iss !== "https://discord.com") return withSession(back("home", "signin_failed"), ctx, cleared);
  if (q.get("error")) return withSession(back(oauth.next === "confirm" ? "home" : oauth.next, "signin_cancelled"), ctx, cleared);
  const code = q.get("code");
  const client = discordClient();
  if (!code || !client) return withSession(back("home", "signin_failed"), ctx, cleared);

  try {
    const token = await fetch(DISCORD_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${client.id}:${client.secret}`).toString("base64")}` },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: discordRedirectUri(), code_verifier: oauth.verifier }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!token.ok) return withSession(back("home", "signin_failed"), ctx, cleared);
    const { access_token: accessToken } = (await token.json()) as { access_token?: string };
    if (!accessToken) return withSession(back("home", "signin_failed"), ctx, cleared);
    // Used once, here, to learn who signed in; never stored or logged.
    const me = await fetch(DISCORD_ME, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!me.ok) return withSession(back("home", "signin_failed"), ctx, cleared);
    const user = (await me.json()) as { id?: string; username?: string };
    if (!user.id || !/^\d{17,20}$/.test(user.id)) return withSession(back("home", "signin_failed"), ctx, cleared);
    const session: LinkSession = { ...cleared, did: user.id, dname: (user.username ?? "").slice(0, 32) };
    return withSession(back(oauth.next), ctx, session);
  } catch {
    return withSession(back("home", "signin_failed"), ctx, cleared);
  }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const route = (await params).path.join("/");
  const ctx = guard(request, { post: true });
  if (ctx instanceof NextResponse) return ctx;
  const body = await readBody(request);
  if (!body) return withSession(problem(400, "bad_request", "That request couldn't be read."), ctx, ctx.session);

  switch (route) {
    case "code":
      return relay(await linkBot(request, "web/code", { code: str(body.code, 32), browserSession: ctx.session.sid, discordId: ctx.session.did ?? null }), ctx);

    case "confirm":
      if (!signedIn(ctx)) return withSession(problem(401, "not_signed_in", "Sign in with Discord first."), ctx, ctx.session);
      return relay(
        await linkBot(request, "web/confirm", {
          browserSession: ctx.session.sid,
          discordId: ctx.session.did,
          discordName: ctx.session.dname ?? null,
          decision: body.decision === "link" ? "link" : body.decision === "deny" ? "deny" : "",
        }),
        ctx,
      );

    case "unlink":
      if (!signedIn(ctx)) return withSession(problem(401, "not_signed_in", "Sign in with Discord first."), ctx, ctx.session);
      return relay(await linkBot(request, "web/unlink", { discordId: ctx.session.did, linkId: str(body.linkId, 40) }), ctx);

    case "delete-my-data": {
      if (!signedIn(ctx)) return withSession(problem(401, "not_signed_in", "Sign in with Discord first."), ctx, ctx.session);
      const answer = await linkBot(request, "web/delete-my-data", { discordId: ctx.session.did, confirm: body.confirm === "DELETE" ? "DELETE" : "" });
      // Signed out afterwards, as the spec says: nothing of theirs is left to show.
      return relay(answer, ctx, answer && answer.status === 200 ? null : ctx.session);
    }

    case "grant": {
      if (!hubBaseUrl()) return withSession(problem(404, "not_found", "Not found."), ctx, ctx.session);
      if (!signedIn(ctx)) return withSession(problem(401, "not_signed_in", "Sign in with Discord first."), ctx, ctx.session);
      const appId = str(body.appId, 40);
      if (!APP_ID.test(appId)) return withSession(problem(404, "unknown_app", "That bot isn't one this service knows."), ctx, ctx.session);
      const categories = Array.isArray(body.categories) ? body.categories.filter((c): c is string => typeof c === "string" && CATEGORIES.has(c)) : [];
      return relay(await hub(`/web/players/me/grants/${appId}`, "PUT", { discordId: ctx.session.did, categories, identity: body.identity === true }), ctx);
    }

    case "revoke-grant": {
      if (!hubBaseUrl()) return withSession(problem(404, "not_found", "Not found."), ctx, ctx.session);
      if (!signedIn(ctx)) return withSession(problem(401, "not_signed_in", "Sign in with Discord first."), ctx, ctx.session);
      const appId = str(body.appId, 40);
      if (!APP_ID.test(appId)) return withSession(problem(404, "unknown_app", "That bot isn't one this service knows."), ctx, ctx.session);
      const revoked = await hub(`/web/players/me/grants/${appId}/revoke`, "POST", { discordId: ctx.session.did });
      if (!revoked || revoked.status !== 200) return relay(revoked, ctx);
      return relay(await grantsOf(ctx.session.did), ctx);
    }

    case "signout":
      return withSession(json({ signedOut: true }), ctx, null);

    default:
      return withSession(problem(404, "not_found", "Not found."), ctx, ctx.session);
  }
}
