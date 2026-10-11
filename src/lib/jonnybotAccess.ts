import { cache } from "react";
import { getAdminIfAny } from "@/lib/admin";

/**
 * Whether JonnyBot's public pages (home, docs, install, FAQ, privacy, terms) are open to everyone yet. They start closed:
 * until `JONNYBOT_PUBLIC=true`, only people who can open the clan server's admin dashboard see them, and everyone else gets
 * a "still under development" page. (The bot dashboard has its own, separate switch, `DASHBOARD_PUBLIC`.)
 */
export const publicSiteOpen = (): boolean => process.env.JONNYBOT_PUBLIC === "true";

/**
 * Whether this visitor may see JonnyBot's pages: everyone once the site is open, otherwise signed-in admins and developers of
 * the clan's server. Worked out once per request, since the header, the layout and the page all ask.
 */
export const canSeeJonnyBot = cache(async (): Promise<boolean> => publicSiteOpen() || (await getAdminIfAny()) !== null);
