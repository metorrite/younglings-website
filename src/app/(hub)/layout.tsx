import type { ReactNode } from "react";
import { HubShell } from "@/components/hub/HubShell";
import { getOverview } from "@/lib/site";

// The clan name comes from the bot, so this renders per request rather than being baked in at build time.
export const dynamic = "force-dynamic";

export default async function HubLayout({ children }: { children: ReactNode }) {
  const overview = await getOverview();
  return <HubShell clanName={overview?.clan.name ?? "Younglings"}>{children}</HubShell>;
}
