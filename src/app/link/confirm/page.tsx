import { ConfirmPage } from "@/components/rslink/LinkPages";
import { linkPagePath } from "@/lib/rslink/config";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata = { title: "Confirm" };

export default async function LinkConfirm() {
  const site = await currentSite();
  return <ConfirmPage base={linkPagePath(site.linkHost, "/")} />;
}
