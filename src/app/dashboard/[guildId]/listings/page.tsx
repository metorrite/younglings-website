import { ListingsModerator } from "@/components/dashboard/ListingsModerator";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { resolveClanReportAction, restoreClanListingAction, suspendClanListingAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ListingsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const data = await adminApi.clanListings(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader title="Directory moderation" description="Every clan that shares a profile, and any reports about them. Only the bot's owner can act here." />
      <ListingsModerator
        initial={data}
        actions={{
          suspend: suspendClanListingAction.bind(null, guildId),
          restore: restoreClanListingAction.bind(null, guildId),
          resolve: resolveClanReportAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
