import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

/**
 * Auth.js (NextAuth) configuration for "Login with Discord".
 *
 * Scope is just `identify` — enough to show who someone is (username, avatar, Discord user ID).
 * If we later need to confirm someone is actually a member of the Younglings server (not just any
 * Discord user), add the `guilds` scope and check the guild list in the `jwt` callback below, or
 * check membership server-side via JonnyBot's own connection to the guild.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify" } },
    }),
  ],
  callbacks: {
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
