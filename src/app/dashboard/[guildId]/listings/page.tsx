import { HubModerator } from "@/components/dashboard/HubModerator";
import { ListingsModerator } from "@/components/dashboard/ListingsModerator";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import type { HubModeration } from "@/lib/hubModeration";
import { resolveClanReportAction, restoreClanListingAction, suspendClanListingAction } from "./actions";
import { barHubServerAction, liftHubServerAction, relistHubEventAction, resolveHubReportAction, unlistHubEventAction } from "./hubActions";

export const dynamic = "force-dynamic";

export default async function ListingsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [data, hub] = await Promise.all([
    adminApi.clanListings(guild).then(dashboardData),
    adminApi.eventsCall(guild, "GET", "hub-moderation").then(dashboardData) as Promise<HubModeration>,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Directory moderation" description="Every clan that shares a profile, open events on the events hub, and any reports about them. Only the bot's owner can act here." />
      <ListingsModerator
        initial={data}
        actions={{
          suspend: suspendClanListingAction.bind(null, guildId),
          restore: restoreClanListingAction.bind(null, guildId),
          resolve: resolveClanReportAction.bind(null, guildId),
        }}
      />
      <HubModerator
        initial={hub}
        actions={{
          unlist: unlistHubEventAction.bind(null, guildId),
          relist: relistHubEventAction.bind(null, guildId),
          resolve: resolveHubReportAction.bind(null, guildId),
          bar: barHubServerAction.bind(null, guildId),
          lift: liftHubServerAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
