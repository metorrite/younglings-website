import { canSeeJonnyBot } from "@/lib/jonnybotAccess";
import { currentSite } from "@/lib/siteHostsServer";
import { UnderDevelopment } from "./UnderDevelopment";

/**
 * Each JonnyBot page starts with this, so a closed site sends nothing of the page to someone who can't see it. The layout shows the
 * same message, but a layout and its page are rendered side by side, so the layout alone would still let the page's text out in the response.
 */
export async function gateJonnyBot() {
  if (await canSeeJonnyBot()) return null;
  return <UnderDevelopment site={await currentSite()} />;
}
