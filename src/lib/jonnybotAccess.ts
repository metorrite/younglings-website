import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { whoAmI } from "@/lib/jonnybot-admin";

/**
 * Whether JonnyBot's public pages (home, docs, install, FAQ, privacy, terms) are open to everyone yet. They start closed:
 * until `JONNYBOT_PUBLIC=true`, only people who can open the clan server's admin dashboard see them, and everyone else gets
 * a "still under development" page. (The bot dashboard has its own, separate switch, `DASHBOARD_PUBLIC`.)
 */
export const publicSiteOpen = (): boolean => process.env.JONNYBOT_PUBLIC === "true";

/**
 * Whether this visitor may see JonnyBot's pages: everyone once the site is open, otherwise signed-in admins and developers of
 * the clan's server and the admin teams of the trusted beta servers (the bot works that out). Worked out once per request, since the
 * header, the layout and the page all ask.
 */
export const canSeeJonnyBot = cache(async (): Promise<boolean> => {
  if (publicSiteOpen()) return true;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;
  const result = await whoAmI(session.user.id);
  if (!result.ok) return false; // can't ask the bot: closed, not guessed
  return result.data.beta ?? (result.data.allowed && result.data.tier !== "NONE");
});
