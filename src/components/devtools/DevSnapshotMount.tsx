import { DevSnapshotButton } from "@/components/devtools/DevSnapshotButton";
import { currentOwner } from "@/lib/devSnapshotOwner";
import type { SiteInfo } from "@/lib/siteHosts";

/**
 * Mounted once in the root layout, so it covers every face (clan site, JonnyBot site, dashboard, hub, /admin). It renders nothing at all unless the signed-in
 * person owns the bot: the check is on the server, so for everyone else there is no markup and no script, and a signed-out visitor costs no call to the bot.
 */
export async function DevSnapshotMount({ site }: { site: SiteInfo }) {
  const owner = await currentOwner();
  if (!owner) return null;
  return <DevSnapshotButton face={site.hub ? "hub" : site.jonnybot ? "jonnybot" : "clan"} role={`bot owner (${owner.tier.toLowerCase()})`} />;
}
