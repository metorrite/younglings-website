import { cache } from "react";
import { canEnter } from "@/lib/restrictedAccess";
import { switchOpen } from "@/lib/siteSwitches";

/**
 * Whether JonnyBot's public pages (home, docs, install, FAQ, privacy, terms) are open to everyone yet. They start closed:
 * until the owner opens it (the JonnyBot website switch in Super admin, or `JONNYBOT_PUBLIC=true`; `JONNYBOT_PUBLIC=false` keeps it shut), only people who can open the clan server's admin dashboard see them, and everyone else gets
 * a "still under development" page. (The bot dashboard has its own, separate switch, `DASHBOARD_PUBLIC`.)
 */
export const publicSiteOpen = (): Promise<boolean> => switchOpen("jonnybot");

/**
 * Whether this visitor may see JonnyBot's pages: everyone once the site is open, otherwise signed-in admins and developers of
 * the clan's server and the admin teams of the trusted beta servers, and anyone on the owner's access list (the bot works that out). Worked out once per request, since the
 * header, the layout and the page all ask.
 */
export const canSeeJonnyBot = cache(async (): Promise<boolean> => {
  if (await publicSiteOpen()) return true;
  return canEnter("jonnybot"); // can't ask the bot: closed, not guessed
});
