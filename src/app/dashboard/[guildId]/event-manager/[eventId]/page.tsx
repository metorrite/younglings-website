import { EventManager } from "@/components/dashboard/EventManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireEventAccess } from "@/lib/dashboard";
import type { EventAward, EventClaims, EventDetail, EventStandings } from "@/lib/eventTypes";
import { adminApi } from "@/lib/jonnybot-admin";
import { eventApiAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ guildId: string; eventId: string }> }) {
  const { guildId, eventId } = await params;
  const guild = await requireEventAccess(guildId);
  if (!/^\d{1,18}$/.test(eventId)) throw new Error("That isn't a valid event.");
  const [structureResult, ...rest] = await Promise.all([
    adminApi.structure(guild).then(dashboardData),
    adminApi.eventsCall(guild, "GET", `events/${eventId}`).then(dashboardData),
    adminApi.eventsCall(guild, "GET", `events/${eventId}/claims`).then(dashboardData),
    adminApi.eventsCall(guild, "GET", `events/${eventId}/standings`).then(dashboardData),
    adminApi.eventsCall(guild, "GET", `events/${eventId}/awards`).then(dashboardData),
  ]);
  const [detail, claims, standings, awards] = rest as [EventDetail, EventClaims, EventStandings, { awards: EventAward[] }];
  const structure = structureResult;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/dashboard/${guildId}/event-manager`, label: "Event manager" }}
        title={detail.event.name}
        description="Build the event, run it and pay it out. Everything here is checked again by the bot, and every change is kept in the audit log."
      />
      <EventManager initial={detail} initialClaims={claims} initialStandings={standings} initialAwards={awards.awards} structure={structure} call={eventApiAction.bind(null, guildId)} />
    </div>
  );
}
