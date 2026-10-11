import type { CookiesOptions, NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

/**
 * Auth.js (NextAuth) configuration for "Login with Discord".
 *
 * Scope is just `identify` — enough to show who someone is (username, avatar, Discord user ID).
 * If we later need to confirm someone is actually a member of the Younglings server (not just any
 * Discord user), add the `guilds` scope and check the guild list in the `jwt` callback below, or
 * check membership server-side via JonnyBot's own connection to the guild.
 */

/**
 * Login across the clan site and JonnyBot's own site. The two are different hostnames (rsyounglings.com and
 * jonnybot.rsyounglings.com), and a cookie belongs to one host unless it names a domain. Setting `AUTH_COOKIE_DOMAIN`
 * (`.rsyounglings.com`) puts every login cookie on the whole domain, so signing in on either signs you in on both. The
 * sign-in itself still completes on NEXTAUTH_URL's host, which is why Discord needs no second redirect address.
 *
 * Without the setting nothing changes. The CSRF cookie's usual `__Host-` prefix forbids a domain, so with a domain it takes the
 * `__Secure-` prefix instead; everyone is signed out once when this is first turned on.
 */
export function authCookies(domain: string | undefined, secure: boolean): Partial<CookiesOptions> | undefined {
  if (!domain) return undefined;
  const prefix = secure ? "__Secure-" : "";
  const options = { httpOnly: true, sameSite: "lax" as const, path: "/", secure, domain };
  const shortLived = { ...options, maxAge: 15 * 60 };
  return {
    sessionToken: { name: `${prefix}next-auth.session-token`, options },
    callbackUrl: { name: `${prefix}next-auth.callback-url`, options },
    csrfToken: { name: `${prefix}next-auth.csrf-token`, options },
    pkceCodeVerifier: { name: `${prefix}next-auth.pkce.code_verifier`, options: shortLived },
    state: { name: `${prefix}next-auth.state`, options: shortLived },
    nonce: { name: `${prefix}next-auth.nonce`, options },
  };
}

/** Whether `url` is an address on the site's own domain (the clan site or JonnyBot's), where a signed-in person may be sent back to. */
export function onSiteDomain(url: string, cookieDomain: string | undefined): boolean {
  if (!cookieDomain) return false;
  try {
    const parsed = new URL(url);
    const domain = cookieDomain.replace(/^\./, "");
    return parsed.protocol === "https:" && (parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify" } },
    }),
  ],
  cookies: authCookies(cookieDomain, (process.env.NEXTAUTH_URL ?? "").startsWith("https://")),
  callbacks: {
    // After signing in or out a person may be sent back to either of the site's faces, not just the host that finished the sign-in.
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl || onSiteDomain(url, cookieDomain)) return url;
      return baseUrl;
    },
    // The Discord provider already puts a display name/avatar URL on the default session; we
    // only need to additionally carry the raw Discord user ID through the JWT to expose it.
    async jwt({ token, profile }) {
      if (profile) {
        token.discordId = (profile as { id: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.discordId as string;
      }
      return session;
    },
  },
};
