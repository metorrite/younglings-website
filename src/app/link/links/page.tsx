import { MyLinksPage } from "@/components/rslink/LinkPages";
import { MyGrants } from "@/components/rslink/GrantPage";
import { hubBaseUrl } from "@/lib/hub";
import { linkPagePath } from "@/lib/rslink/config";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata = { title: "My links" };

export default async function LinkMyLinks() {
  const site = await currentSite();
  return (
    <div className="space-y-4">
      <MyLinksPage base={linkPagePath(site.linkHost, "/")} />
      {/* with the RuneClans hub, the bots the player let see their plugin data (T-163) */}
      {hubBaseUrl() && <MyGrants />}
    </div>
  );
}
