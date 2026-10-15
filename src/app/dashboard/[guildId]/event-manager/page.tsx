import { EventListView } from "@/components/dashboard/EventListView";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import type { EventList } from "@/lib/eventTypes";
import { adminApi } from "@/lib/jonnybot-admin";
import { eventApiAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EventManagerPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [list, structure] = await Promise.all([adminApi.eventsCall(guild, "GET", "events").then(dashboardData) as Promise<EventList>, adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event manager"
        description="Run bingos, competitions and any other event: objectives with points, teams or solo players, proof from your members, buy-ins and prizes, all in one place."
      />
      <EventListView initial={list} structure={structure} guildId={guildId} call={eventApiAction.bind(null, guildId)} />
    </div>
  );
}
