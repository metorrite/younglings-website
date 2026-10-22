/**
 * The RuneClans hub (metorrite/runeclans-hub) as this site's backend for RS Link and RuneSync, when `HUB_BASE_URL` is set (T-159). Unset,
 * every caller keeps using the bot's internal API exactly as before. Server only: it carries `HUB_WEB_SECRET`.
 *
 * What moves to the hub when it is set:
 * - the RS Link sign-in page (`/api/link/web/*`): bot `/internal/rsnlink/web/<route>` becomes hub `/web/link/<route>`;
 * - the RS Link plugin proxy (`/api/link/v1/*`): bot `/internal/rsnlink/v1/<route>` becomes hub `/v1/link/<route>`;
 * - RuneSync with an RS Link assertion: upload, whoami, settings, in-game consent and diagnostics go to the hub's `/v1/plugin/...`
 *   (T-163); the settings answer still takes `panelAvailable` from the bot, whose clan panel stays there;
 * - the profile's plugin tab: consent, stored events, RuneSync activity and the bots the player granted (lib/plugin.ts).
 * Manual `jbp_` tokens, the clan visibility switch and the in-game clan panel stay on the bot.
 *
 * No imports, so the path rules can be tested with `node --test`.
 */

export interface HubAnswer<T = unknown> {
  status: number;
  /** The parsed JSON body, or an empty object if it wasn't JSON. */
  json: T;
}

type Env = Record<string, string | undefined>;

/** The hub's address without a trailing slash, or null when the site doesn't use the hub. Plain http only for localhost. */
export function hubBaseUrl(env: Env = process.env): string | null {
  const raw = (env.HUB_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!raw) return null;
  if (!(raw.startsWith("https://") || raw.startsWith("http://localhost") || raw.startsWith("http://127.0.0.1"))) return null;
  return raw;
}

/** The hub path for a bot `/internal/rsnlink/<path>` path (`v1/...` or `web/...`), or null when the hub has no such route. */
export function hubLinkPath(rsnlinkPath: string): string | null {
  const p = rsnlinkPath.replace(/^\/+/, "");
  if (/^v1\/[a-z0-9/-]+$/.test(p)) return `/v1/link/${p.slice(3)}`;
  if (/^web\/[a-z0-9/-]+$/.test(p)) return `/web/link/${p.slice(4)}`;
  return null;
}

/**
 * The hub path for a bot `/internal/plugin/...` path when the hub serves it for RS Link assertions, else null (keep it on the bot). A query
 * string is kept. The in-game clan panel (`runesync/panel`) is JonnyBot's and stays there.
 */
export function hubPluginPath(internalPath: string): string | null {
  const q = internalPath.indexOf("?");
  const path = q < 0 ? internalPath : internalPath.slice(0, q);
  const query = q < 0 ? "" : internalPath.slice(q);
  const mapped: Record<string, string> = {
    "/internal/plugin/ingest": "/v1/plugin/ingest",
    "/internal/plugin/whoami": "/v1/plugin/whoami",
    "/internal/plugin/runesync/config": "/v1/plugin/runesync/config",
    "/internal/plugin/runesync/consent": "/v1/plugin/runesync/consent",
    "/internal/plugin/runesync/diagnostics": "/v1/plugin/runesync/diagnostics",
  };
  return mapped[path] ? mapped[path] + query : null;
}

/**
 * Calls the hub with the site's web secret. The secret is what lets the hub trust `X-Link-Client-Ip` and the Discord id in a body (the
 * site has verified the sign-in). Null when the hub isn't configured or can't be reached, like `botCall`.
 */
export async function hubCall<T = unknown>(
  path: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
  env: Env = process.env,
): Promise<HubAnswer<T> | null> {
  const base = hubBaseUrl(env);
  const secret = (env.HUB_WEB_SECRET ?? "").trim();
  if (!base || !secret) return null;
  try {
    const response = await fetch(`${base}${path}`, {
      method: init.method ?? "GET",
      headers: { "X-Hub-Web-Secret": secret, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
      body: init.body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    let json: unknown = {};
    try {
      json = await response.json();
    } catch {
      // an empty or non-JSON body is treated as {}
    }
    return { status: response.status, json: json as T };
  } catch {
    return null;
  }
}
