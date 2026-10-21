import { EventDefaultsCard, type EventDefaultsView } from "@/components/dashboard/EventDefaultsCard";
import { EventListView } from "@/components/dashboard/EventListView";
import type { DraftList, TemplateList } from "@/components/dashboard/setup/EventStreams";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireEventAccess } from "@/lib/dashboard";
import type { EventKind } from "@/lib/eventOptions";
import type { EventList } from "@/lib/eventTypes";
import { adminApi } from "@/lib/jonnybot-admin";
import { eventApiAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EventManagerPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireEventAccess(guildId);
  const [list, structure, kinds, drafts, templates] = await Promise.all([
  const guild = await requireGuild(guildId);
  const [list, structure, kinds, drafts, templates, defaults] = await Promise.all([
    adminApi.eventsCall(guild, "GET", "events").then(dashboardData) as Promise<EventList>,
    adminApi.structure(guild).then(dashboardData),
    adminApi.eventsCall(guild, "GET", "events/templates").then(dashboardData) as Promise<{ templates: EventKind[] }>,
    adminApi.eventsCall(guild, "GET", "events/drafts").then(dashboardData) as Promise<DraftList>,
    adminApi.eventsCall(guild, "GET", "events/saved-templates").then(dashboardData) as Promise<TemplateList>,
    adminApi.eventsCall(guild, "GET", "events/defaults").then(dashboardData) as Promise<EventDefaultsView>,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event manager"
        description="Run bingos, competitions and any other event: objectives with points, teams or solo players, proof from your members, buy-ins and prizes, all in one place."
      />
      <EventListView initial={list} kinds={kinds.templates} drafts={drafts} templates={templates} structure={structure} guildId={guildId} call={eventApiAction.bind(null, guildId)} />
      <EventDefaultsCard initial={defaults} call={eventApiAction.bind(null, guildId)} />
    </div>
  );
}
