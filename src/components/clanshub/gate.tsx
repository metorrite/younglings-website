import { canSeeHub } from "@/lib/hubAccess";
import { currentSite } from "@/lib/siteHostsServer";
import { HubClosed } from "./HubClosed";

/**
 * Each hub page starts with this, so a closed hub sends nothing of the page (and fetches nothing from the bot) for someone who can't see it.
 * A layout and its page render side by side, so a layout alone would still let the page's text out in the response.
 */
export async function gateHub() {
  if (await canSeeHub()) return null;
  return <HubClosed site={await currentSite()} />;
}
