/**
 * One website, several faces: the clan's own site (rsyounglings.com), JonnyBot's (jonnybot.rsyounglings.com), the clans hub and
 * the API are the same deployment, told apart by the hostname a request was addressed to. Everything here is pure (no framework
 * imports) so the request proxy, which cannot import most of the app, can use it too.
 *
 * Switched on by `JONNYBOT_SUBDOMAIN=true`. Without it the site behaves exactly as it always has: one host, JonnyBot's pages
 * under /jonnybot and the dashboard under /dashboard. `SITE_APEX_HOST` (say `rsyounglings.com`, falling back to the host in
 * `AUTH_COOKIE_DOMAIN`) names the clan site's own address, so that any other subdomain someone types is sent there instead
 * of reaching one of the faces by accident.
 *
 * The host map (docs/DOMAINS-AND-SITE-BUILDER.md section A2) lets the faces live on any domains, not just prefixes of one apex:
 * - `SITE_HOSTS="clan=rsyounglings.com,jonnybot=jonnybot.example,hub=example,events=events.example,api=api.example,link=link.example"`
 *   names each face's canonical host. A face left out keeps today's prefix rule.
 * - `SITE_HOST_ALIASES="clans.rsyounglings.com=hub,api.rsyounglings.com=api"` are old hosts of a face. Pages on an alias
 *   redirect (308) to the canonical host; the API on an alias keeps answering, because plugins can't follow redirects.
 * - `SITE_TENANT_SUFFIX="example"`: `<slug>.example` is a hosted clan site (the website builder), unless the slug is reserved.
 * With none of the three set, every function here answers exactly as before the map existed.
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
/** The faces a host can be mapped to. */
export type Face = "clan" | "jonnybot" | "hub" | "events" | "api" | "link";
const FACES: readonly Face[] = ["clan", "jonnybot", "hub", "events", "api", "link"];

/** `site` is a hosted clan site under SITE_TENANT_SUFFIX. */
export type HostKind = Face | "site" | "unknown";

/** Never a hosted clan site's slug, whatever the clan is called. Anything that is the first label of a mapped host is reserved too. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "www", "api", "link", "events", "clans", "jonnybot", "admin", "auth", "mail", "status", "cdn", "static", "assets", "dev", "staging",
]);

const bare = (host: string) => host.toLowerCase().replace(/:\d+$/, "");
const portOf = (host: string) => host.match(/:\d+$/)?.[0] ?? "";
const cleanHost = (raw: string) => raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^\./, "");

export interface HostConfig {
  /** Face -> canonical host as written (a port is kept, for local testing). */
  hosts: Map<Face, string>;
  /** Bare canonical host -> face. */
  faceOfHost: Map<string, Face>;
  /** Bare old host -> face. */
  aliases: Map<string, Face>;
  /** Bare tenant suffix (no leading dot), or null when hosted clan sites are off. */
  tenantSuffix: string | null;
}

/** Reads `face=host` (or, for aliases, `host=face`) pairs; unknown faces and empty entries are skipped. */
function pairs(raw: string | undefined, hostFirst: boolean): [Face, string][] {
  const out: [Face, string][] = [];
  for (const entry of (raw ?? "").split(",")) {
    const [left, right] = entry.split("=").map((s) => s?.trim() ?? "");
    if (!left || !right) continue;
    const [face, host] = hostFirst ? [right.toLowerCase(), cleanHost(left)] : [left.toLowerCase(), cleanHost(right)];
    if (host && (FACES as readonly string[]).includes(face)) out.push([face as Face, host]);
  }
  return out;
}

let cached: { key: string; config: HostConfig } | null = null;

/** The host map from the environment (parsed once per distinct value, so the proxy can call it on every request). */
export function hostConfig(): HostConfig {
  const key = [process.env.SITE_HOSTS, process.env.SITE_HOST_ALIASES, process.env.SITE_TENANT_SUFFIX].map((v) => v ?? "").join("\u0000");
  if (cached?.key === key) return cached.config;
  const hosts = new Map<Face, string>();
  const faceOfHost = new Map<string, Face>();
  for (const [face, host] of pairs(process.env.SITE_HOSTS, false)) {
    if (hosts.has(face)) continue;
    hosts.set(face, host);
    faceOfHost.set(bare(host), face);
  }
  const aliases = new Map<string, Face>();
  for (const [face, host] of pairs(process.env.SITE_HOST_ALIASES, true)) if (!faceOfHost.has(bare(host))) aliases.set(bare(host), face);
  const tenantSuffix = cleanHost(process.env.SITE_TENANT_SUFFIX ?? "") || null;
  const config = { hosts, faceOfHost, aliases, tenantSuffix };
  cached = { key, config };
  return config;
}

/** The canonical host of a face from the map (as written, port included), or null when the map doesn't name one. */
export function mappedHost(face: Face, config: HostConfig = hostConfig()): string | null {
  return config.hosts.get(face) ?? null;
}

export function subdomainMode(): boolean {
  return process.env.JONNYBOT_SUBDOMAIN === "true" || hostConfig().hosts.has("jonnybot");
}

/** The clan site's own host (no `www.`, no port), or null when the site isn't configured with one (local development). */
export function apexHost(): string | null {
  const mapped = mappedHost("clan");
  if (mapped) return bare(mapped);
  const raw = process.env.SITE_APEX_HOST ?? process.env.AUTH_COOKIE_DOMAIN ?? "";
  const host = raw.trim().replace(/^\./, "").toLowerCase();
  return host || null;
}

/** Whether a hosted clan site may use this slug (not reserved, and not the first label of a host in the map). */
export function isReservedSlug(slug: string, config: HostConfig = hostConfig()): boolean {
  const s = slug.toLowerCase();
  if (RESERVED_SLUGS.has(s)) return true;
  for (const host of config.hosts.values()) if (bare(host).split(".")[0] === s) return true;
  return false;
}

/** The hosted clan site a host is for (`<slug>.<SITE_TENANT_SUFFIX>`), or null. One label only: `a.b.<suffix>` is not a tenant. */
export function tenantSlugOf(host: string | null | undefined, config: HostConfig = hostConfig()): string | null {
  if (!host || !config.tenantSuffix) return null;
  const name = bare(host);
  const link = linkHost();
  if (link && name === link) return "link";
  const suffix = `.${config.tenantSuffix}`;
  if (!name.endsWith(suffix)) return null;
  const slug = name.slice(0, -suffix.length);
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) || isReservedSlug(slug, config)) return null;
  return slug;
}

/** What a host is, and whether it is an old alias of its face (pages there redirect to the canonical host; the API does not). */
export function resolveHost(host: string | null | undefined, apex: string | null = apexHost(), config: HostConfig = hostConfig()): { kind: HostKind; alias: boolean } {
  if (!host) return { kind: "clan", alias: false };
  const name = bare(host);
  const mapped = config.faceOfHost.get(name);
  if (mapped) return { kind: mapped, alias: false };
  const alias = config.aliases.get(name);
  if (alias) return { kind: alias, alias: true };
  if (tenantSlugOf(name, config)) return { kind: "site", alias: false };
  return { kind: prefixRule(name, apex), alias: false };
}

/** Today's rule: fixed prefixes on one apex. */
function prefixRule(name: string, apex: string | null): HostKind {
  if (name.startsWith(PREFIX)) return "jonnybot";
  if (name.startsWith(API_PREFIX)) return "api";
  if (name.startsWith(HUB_PREFIX)) return "hub";
  if (!apex) return "clan";
  if (name === apex || name === `www.${apex}`) return "clan";
  // some other name under the site's domain (a typo, a stranger's guess): not either face
  if (name.endsWith(`.${apex}`)) return "unknown";
  return "clan"; // localhost, Railway's own address, anything that isn't ours to judge
}

/** Which face a request's host belongs to. */
export function classifyHost(host: string | null | undefined, apex: string | null = apexHost()): HostKind {
  return resolveHost(host, apex).kind;
}

/** The clan site's host for a request to any of our hosts: the mapped host, else the apex when it is known, else the host with the face prefix removed. */
export function clanHostOf(host: string, apex: string | null = apexHost()): string {
  const mapped = mappedHost("clan");
  if (mapped) return mapped;
  const port = portOf(host);
  const name = bare(host);
  if (apex) return apex + port;
  return name.replace(/^(jonnybot\.|clans\.|api\.)/, "") + port;
}

export function jonnybotHostOf(host: string, apex: string | null = apexHost()): string {
  const mapped = mappedHost("jonnybot");
  if (mapped) return mapped;
  const port = portOf(host);
  const base = apex ?? bare(host).replace(/^(jonnybot\.|clans\.|api\.|www\.)/, "");
  return PREFIX + base + port;
}

/**
 * The API's own address, for telling clients (the plugin) where to send things. `PUBLIC_API_ORIGIN` wins when set; then the API
 * host in the map; otherwise `api.` + the site's apex host; otherwise null (local development, where the API is just this host's /api).
 */
export function apiOriginFor(host: string, forwardedProto?: string | null): string | null {
  const configured = process.env.PUBLIC_API_ORIGIN?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const mapped = mappedHost("api");
  if (mapped) return `${schemeFor(mapped, forwardedProto)}://${mapped}`;
  const apex = apexHost();
  return apex ? `${schemeFor(host, forwardedProto)}://${API_PREFIX}${apex}${portOf(host)}` : null;
}

export function schemeFor(host: string, forwardedProto?: string | null): string {
  if (forwardedProto) return forwardedProto.split(",")[0].trim();
  const name = bare(host);
  return name === "localhost" || name.endsWith(".localhost") ? "http" : "https";
}

/** What a page needs to know to link between the faces. */
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
  /** Whether the hub has its own host (clans.<domain>, or the map's hub host), so its paths have no /hub prefix. */
  hubHost: boolean;
  /** Whether the two faces live on different hostnames. */
  split: boolean;
  clanOrigin: string;
  jonnybotOrigin: string;
  /** Whether SITE_HOSTS names any face: cross-face links are then absolute, to the mapped hosts. */
  mapped: boolean;
  /** The mapped origins of the hub, events and RS Link faces ("" when the map doesn't name one). */
  hubOrigin: string;
  eventsOrigin: string;
  linkOrigin: string;
  /** The slug of the hosted clan site this request is for (the proxy marks it with the `site` face), or null. */
  tenant: string | null;
}

export function siteInfoFor(host: string, forwardedProto?: string | null, face?: string | null): SiteInfo {
  const split = subdomainMode();
  const config = hostConfig();
  const mapped = config.hosts.size > 0;
  const scheme = schemeFor(host, forwardedProto);
  const hub = face === "hub" || classifyHost(host) === "hub";
  const link = face === "link" || classifyHost(host) === "link";
  const jonnybot = !hub && (face === "jonnybot" || (split && classifyHost(host) === "jonnybot"));
  const kind = classifyHost(host);
  const hub = face === "hub" || kind === "hub";
  const jonnybot = !hub && (face === "jonnybot" || (split && kind === "jonnybot"));
  const origin = (f: Face) => {
    const h = mappedHost(f, config);
    return h ? `${schemeFor(h, forwardedProto)}://${h}` : "";
  };
  return {
    host,
    jonnybot,
    hub,
    link,
    linkHost: classifyHost(host) === "link",
    hubHost: classifyHost(host) === "hub",
    hubHost: kind === "hub",
    split,
    clanOrigin: split || mapped || kind === "hub" ? `${scheme}://${clanHostOf(host)}` : "",
    jonnybotOrigin: split || mapped || kind === "hub" ? `${scheme}://${jonnybotHostOf(host)}` : "",
    mapped,
    hubOrigin: origin("hub"),
    eventsOrigin: origin("events"),
    linkOrigin: origin("link"),
    tenant: face === "site" ? tenantSlugOf(host, config) : null,
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

/** A link to a page of the clans hub: its own host has short paths, a mapped hub host is linked to, otherwise (local development) the hub lives under /hub. */
export function hubHref(site: SiteInfo, path: string): string {
  if (site.hubHost) return path;
  if (site.hubOrigin) return `${site.hubOrigin}${path}`;
  return `/hub${path === "/" ? "" : path}`;
}

/** A link to a page of the clan's face. */
export function clanHref(site: SiteInfo, path: string): string {
  return site.split || site.mapped ? `${site.clanOrigin}${path}` : path;
}

/** A link to the public events pages: the events host when the map names one, otherwise the hub's events page. */
export function eventsHref(site: SiteInfo, path: string): string {
  if (site.eventsOrigin) return `${site.eventsOrigin}${path}`;
  return hubHref(site, `/events${path === "/" ? "" : path}`);
}

/** A link to RS Link's pages: the link host when the map names one, otherwise /link on this host. */
export function linkHref(site: SiteInfo, path: string): string {
  if (site.linkOrigin) return `${site.linkOrigin}${path}`;
  return `/link${path === "/" ? "" : path}`;
}
