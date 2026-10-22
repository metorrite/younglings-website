import { notFound } from "next/navigation";
import { GrantPage } from "@/components/rslink/GrantPage";
import { hubBaseUrl } from "@/lib/hub";
import { linkPagePath } from "@/lib/rslink/config";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata = { title: "Allow a bot" };

/** A bot's request to see some of the player's plugin data (T-163). Only with the RuneClans hub (`HUB_BASE_URL`). `?app=` names the bot. */
export default async function LinkGrant({ searchParams }: { searchParams: Promise<{ app?: string; error?: string }> }) {
  if (!hubBaseUrl()) notFound();
  const q = await searchParams;
  const app = typeof q.app === "string" ? q.app.toLowerCase().replace(/[^0-9a-f-]/g, "").slice(0, 36) : "";
  if (!app) notFound();
  const site = await currentSite();
  return <GrantPage appId={app} base={linkPagePath(site.linkHost, "/")} signInError={typeof q.error === "string" ? q.error.slice(0, 32) : undefined} />;
}
