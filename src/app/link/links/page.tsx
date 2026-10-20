import { MyLinksPage } from "@/components/rslink/LinkPages";
import { linkPagePath } from "@/lib/rslink/config";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata = { title: "My links" };

export default async function LinkMyLinks() {
  const site = await currentSite();
  return <MyLinksPage base={linkPagePath(site.linkHost, "/")} />;
}
