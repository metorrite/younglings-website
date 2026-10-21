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
const HUB_PREFIX = "clans.";

/** The request header the proxy sets so pages know which face a request is for, whatever its path or host. */
export const FACE_HEADER = "x-site-face";

export type HostKind = "jonnybot" | "clan" | "api" | "hub" | "link" | "unknown";

/**
 * The RS Link sign-in face's own hostname (`LINK_HOST`, e.g. `link.example.org`), or null. Unset, the face is reachable only under `/link` on
 * any host (local development). It is a whole name, not a prefix, because its final domain is chosen separately (LINK-SYSTEM.md section 14).
 */
export function linkHost(): string | null {
  const raw = (process.env.LINK_HOST ?? "").trim().toLowerCase().replace(/:\d+$/, "");
  return raw || null;
}

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
  const link = linkHost();
  if (link && name === link) return "link";
  if (name.startsWith(PREFIX)) return "jonnybot";
  if (name.startsWith(API_PREFIX)) return "api";
  if (name.startsWith(HUB_PREFIX)) return "hub";
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
  const base = apex ?? bare(host).replace(/^(jonnybot\.|clans\.|api\.|www\.)/, "");
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
  /** Whether this is the clans hub (the public directory of clans), a third face of the same site. */
  hub: boolean;
  /** Whether this is the neutral RS Link sign-in face (no clan or JonnyBot branding at all). */
  link: boolean;
  /** Whether the RS Link face has its own host (`LINK_HOST`), so its paths have no /link prefix. */
  linkHost: boolean;
  /** Whether the hub has its own host (clans.<domain>), so its paths have no /hub prefix. */
  hubHost: boolean;
  /** Whether the two faces live on different hostnames. */
  split: boolean;
  clanOrigin: string;
  jonnybotOrigin: string;
}

export function siteInfoFor(host: string, forwardedProto?: string | null, face?: string | null): SiteInfo {
  const split = subdomainMode();
  const scheme = schemeFor(host, forwardedProto);
  const hub = face === "hub" || classifyHost(host) === "hub";
  const link = face === "link" || classifyHost(host) === "link";
  const jonnybot = !hub && (face === "jonnybot" || (split && classifyHost(host) === "jonnybot"));
  return {
    host,
    jonnybot,
    hub,
    link,
    linkHost: classifyHost(host) === "link",
    hubHost: classifyHost(host) === "hub",
    split,
    clanOrigin: split || classifyHost(host) === "hub" ? `${scheme}://${clanHostOf(host)}` : "",
    jonnybotOrigin: split || classifyHost(host) === "hub" ? `${scheme}://${jonnybotHostOf(host)}` : "",
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

/** A link to a page of the clans hub: its own host has short paths, otherwise (local development) the hub lives under /hub. */
export function hubHref(site: SiteInfo, path: string): string {
  if (site.hubHost) return path;
  return `/hub${path === "/" ? "" : path}`;
}

/** A link to a page of the clan's face. */
export function clanHref(site: SiteInfo, path: string): string {
  return site.split ? `${site.clanOrigin}${path}` : path;
}
