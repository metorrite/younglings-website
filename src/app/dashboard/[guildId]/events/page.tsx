import { PublicEventsManager } from "@/components/dashboard/PublicEventsManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { setEventScopeAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PublicEventsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const events = await adminApi.clanEvents(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader title="Public events" description="Choose which of your Discord events are shown in the public clan directory, for other clans and players to find." />
      <PublicEventsManager initial={events} profileHref={`/dashboard/${guildId}/clan-profile`} actions={{ setScope: setEventScopeAction.bind(null, guildId) }} />
    </div>
  );
}
