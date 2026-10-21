/**
 * Signing in across two domains (docs/DOMAINS-AND-SITE-BUILDER.md A3). A cookie can't span two apexes (say rsyounglings.com and a
 * neutral platform domain), so `AUTH_COOKIE_DOMAINS=".rsyounglings.com,.example"` lists one cookie domain per apex: the session cookie
 * is set for the apex of the host being used. Discord sign-in always completes on one auth host (`NEXTAUTH_URL`); someone who started
 * on the other apex is sent back through a one-time handoff code (lib/authHandoff). With one domain (today: `AUTH_COOKIE_DOMAIN`), or
 * none, nothing here changes anything. Pure (no imports), so the tests can load it directly.
 */

const bare = (host: string) => host.trim().toLowerCase().replace(/:\d+$/, "").replace(/^\./, "");

/** The cookie domains, each with its leading dot (`.example`). `AUTH_COOKIE_DOMAINS` wins; else the single `AUTH_COOKIE_DOMAIN`; else none. */
export function cookieDomains(env: Record<string, string | undefined> = process.env): string[] {
  const raw = env.AUTH_COOKIE_DOMAINS?.trim() ? env.AUTH_COOKIE_DOMAINS : (env.AUTH_COOKIE_DOMAIN ?? "");
  const out: string[] = [];
  for (const entry of raw.split(",")) {
    const d = bare(entry);
    if (d && /^[a-z0-9.-]+$/.test(d) && !out.includes(`.${d}`)) out.push(`.${d}`);
  }
  return out;
}

/** Whether there is more than one apex to sign in on (the handoff is only used then). */
export function multiDomain(domains: string[] = cookieDomains()): boolean {
  return domains.length > 1;
}

/** The cookie domain a host's cookies belong to, or undefined when it is none of ours (local development, Railway's own address). */
export function cookieDomainFor(host: string | null | undefined, domains: string[] = cookieDomains()): string | undefined {
  if (!host) return undefined;
  const name = bare(host);
  return domains.find((d) => name === d.slice(1) || name.endsWith(d));
}

/** The host of `NEXTAUTH_URL`, where every Discord sign-in completes. */
export function authHost(env: Record<string, string | undefined> = process.env): string | null {
  try {
    return env.NEXTAUTH_URL ? new URL(env.NEXTAUTH_URL).host.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Whether a signed-in person may be sent to `url`: https, on one of the cookie domains or a host `mappedHost` accepts (the callers pass
 * the `SITE_HOSTS` / `SITE_HOST_ALIASES` check). Nothing else, so the sign-in can't be used to bounce people to a stranger's site.
 */
export function allowedRedirect(url: string, domains: string[] = cookieDomains(), mappedHost: (host: string) => boolean = () => false): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
  const name = parsed.hostname.toLowerCase();
  return Boolean(cookieDomainFor(name, domains)) || mappedHost(name);
}

/** Whether `url` is on another apex than `host` (so a cookie set on `host` won't reach it and a handoff is needed). */
export function needsHandoff(url: string, host: string | null, domains: string[] = cookieDomains()): boolean {
  if (!multiDomain(domains) || !host) return false;
  try {
    const target = cookieDomainFor(new URL(url).hostname, domains);
    return Boolean(target) && target !== cookieDomainFor(host, domains);
  } catch {
    return false;
  }
}

/** A path on this site to go back to after a handoff: a plain path only (no `//host`, no scheme). */
export function safePath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw.slice(0, 1000);
}
