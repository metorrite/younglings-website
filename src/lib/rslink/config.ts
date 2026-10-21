/**
 * Configuration of the RS Link sign-in face (LINK-SYSTEM.md section 14). Everything that will change before release is here and comes
 * from the environment, so the final domain and the separate Discord application are config changes, not code changes:
 *
 * - `LINK_ENABLED=true` switches the face on. Off (the default), `/link` and `/api/link/*` answer 404.
 * - `LINK_HOST` gives it its own hostname (see siteHosts); unset, it lives under `/link` on any host.
 * - `LINK_PUBLIC_BASE_URL` is the address players type and the base of the Discord redirect.
 * - `LINK_DISCORD_CLIENT_ID` / `LINK_DISCORD_CLIENT_SECRET` name the Discord application players sign in with. Unset, JonnyBot's own
 *   application (`DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`) is used, as Drake decided for now.
 * - `LINK_COOKIE_KEY` (32+ random bytes, base64) seals the page's own session cookie.
 * - `LINK_SOURCE_URL` and `LINK_CONTACT_EMAIL` fill the footer once they exist (the public repo, the contact address); unset, they are left out.
 */

export function linkEnabled(): boolean {
  return process.env.LINK_ENABLED === "true";
}

export function linkBaseUrl(): string {
  const raw = process.env.LINK_PUBLIC_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return raw.trim().replace(/\/+$/, "");
}

/** The sign-in application, or null when neither the link app nor JonnyBot's app is configured. */
export function discordClient(): { id: string; secret: string } | null {
  const id = (process.env.LINK_DISCORD_CLIENT_ID ?? process.env.DISCORD_CLIENT_ID ?? "").trim();
  const secret = (process.env.LINK_DISCORD_CLIENT_SECRET ?? process.env.DISCORD_CLIENT_SECRET ?? "").trim();
  return id && secret ? { id, secret } : null;
}

/** The one redirect address to register on the Discord application. The /api path works on every host, so it never needs to change with LINK_HOST. */
export function discordRedirectUri(): string {
  return `${linkBaseUrl()}/api/link/web/auth/callback`;
}

export function sourceUrl(): string | null {
  return process.env.LINK_SOURCE_URL?.trim() || null;
}

export function contactEmail(): string | null {
  return process.env.LINK_CONTACT_EMAIL?.trim() || null;
}

/** A page of the face: on its own host the paths are short (`/links`), elsewhere they live under `/link`. */
export function linkPagePath(ownHost: boolean, path: string): string {
  if (ownHost) return path;
  return path === "/" ? "/link" : `/link${path}`;
}

/** The address shown to players: the base URL without its scheme, as short as possible to type from the game. */
export function displayAddress(): string {
  return linkBaseUrl().replace(/^https?:\/\//, "");
}
