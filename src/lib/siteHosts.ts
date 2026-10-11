/**
 * One website, two faces: the clan's own site (rsyounglings.com) and JonnyBot's (jonnybot.rsyounglings.com) are the same
 * deployment, told apart by the hostname a request was addressed to. Everything here is pure (no framework imports) so the
 * request proxy, which cannot import most of the app, can use it too.
 *
 * Switched on by `JONNYBOT_SUBDOMAIN=true`. Without it the site behaves exactly as it always has: one host, JonnyBot's pages
 * under /jonnybot and the dashboard under /dashboard. `SITE_APEX_HOST` (say `rsyounglings.com`, falling back to the host in
 * `AUTH_COOKIE_DOMAIN`) names the clan site's own address, so that any other subdomain someone types is sent there instead
 * of reaching one of the two faces by accident.
 */

const PREFIX = "jonnybot.";
const API_PREFIX = "api.";

/** The request header the proxy sets so pages know which face a request is for, whatever its path or host. */
export const FACE_HEADER = "x-site-face";

export type HostKind = "jonnybot" | "clan" | "api" | "unknown";

export function subdomainMode(): boolean {
  return process.env.JONNYBOT_SUBDOMAIN === "true";
}

/** The clan site's own host (no `www.`, no port), or null when the site isn't configured with one (local development). */
export function apexHost(): string | null {
  const raw = process.env.SITE_APEX_HOST ?? process.env.AUTH_COOKIE_DOMAIN ?? "";
  const host = raw.trim().replace(/^\./, "").toLowerCase();
  return host || null;
}

const bare = (host: string) => host.toLowerCase().replace(/:\d+$/, "");
const portOf = (host: string) => host.match(/:\d+$/)?.[0] ?? "";

/** Which face a request's host belongs to. */
export function classifyHost(host: string | null | undefined, apex: string | null = apexHost()): HostKind {
  if (!host) return "clan";
  const name = bare(host);
  if (name.startsWith(PREFIX)) return "jonnybot";
  if (name.startsWith(API_PREFIX)) return "api";
  if (!apex) return "clan";
  if (name === apex || name === `www.${apex}`) return "clan";
  // some other name under the site's domain (a typo, a stranger's guess): not either face
  if (name.endsWith(`.${apex}`)) return "unknown";
  return "clan"; // localhost, Railway's own address, anything that isn't ours to judge
}

/** The clan site's host for a request to any of our hosts: the apex when it is known, else the host with the JonnyBot prefix removed. */
export function clanHostOf(host: string, apex: string | null = apexHost()): string {
  const port = portOf(host);
  const name = bare(host);
  if (apex) return apex + port;
  return name.replace(/^(jonnybot\.|clans\.|api\.)/, "") + port;
}

export function jonnybotHostOf(host: string, apex: string | null = apexHost()): string {
  const port = portOf(host);
  const base = apex ?? bare(host).replace(new RegExp(`^(${PREFIX.replace(".", "\.")}|www\.)`), "");
  return PREFIX + base + port;
}

/**
 * The API's own address, for telling clients (the plugin) where to send things. `PUBLIC_API_ORIGIN` wins when set; otherwise
 * `api.` + the site's apex host; otherwise null (local development, where the API is just this host's /api).
 */
export function apiOriginFor(host: string, forwardedProto?: string | null): string | null {
  const configured = process.env.PUBLIC_API_ORIGIN?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const apex = apexHost();
  return apex ? `${schemeFor(host, forwardedProto)}://${API_PREFIX}${apex}${portOf(host)}` : null;
}

export function schemeFor(host: string, forwardedProto?: string | null): string {
  if (forwardedProto) return forwardedProto.split(",")[0].trim();
  const name = bare(host);
  return name === "localhost" || name.endsWith(".localhost") ? "http" : "https";
}

/** What a page needs to know to link between the two faces. */
export interface SiteInfo {
  host: string;
  jonnybot: boolean;
  /** Whether the two faces live on different hostnames. */
  split: boolean;
  clanOrigin: string;
  jonnybotOrigin: string;
}

export function siteInfoFor(host: string, forwardedProto?: string | null, face?: string | null): SiteInfo {
  const split = subdomainMode();
  const scheme = schemeFor(host, forwardedProto);
  const jonnybot = face === "jonnybot" || (split && classifyHost(host) === "jonnybot");
  return {
    host,
    jonnybot,
    split,
    clanOrigin: split ? `${scheme}://${clanHostOf(host)}` : "",
    jonnybotOrigin: split ? `${scheme}://${jonnybotHostOf(host)}` : "",
  };
}

/**
 * A link to a page of JonnyBot's face. Split: on the JonnyBot host, with the page's own path. Not split: on this host, where
 * JonnyBot's own pages live under /jonnybot and the dashboard stays at /dashboard.
 */
export function jonnybotHref(site: SiteInfo, path: string): string {
  if (site.split) return `${site.jonnybotOrigin}${path}`;
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return path;
  return `/jonnybot${path === "/" ? "" : path}`;
}

/** A link to a page of the clan's face. */
export function clanHref(site: SiteInfo, path: string): string {
  return site.split ? `${site.clanOrigin}${path}` : path;
}
