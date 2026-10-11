import type { Metadata } from "next";
import { EventRow, Unavailable } from "@/components/clanshub/parts";
import { allEvents } from "@/lib/clansHub";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata: Metadata = { title: "Events", description: "Upcoming events that clans have chosen to share publicly." };
export const dynamic = "force-dynamic";

export default async function HubEvents() {
  const site = await currentSite();
  const events = await allEvents();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
        <p className="mt-2 max-w-2xl text-muted">Upcoming events that clans have chosen to share publicly, soonest first. Times are shown in your own timezone.</p>
      </div>
      {events === null ? (
        <Unavailable />
      ) : events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-surface-border p-8 text-center text-sm text-muted">No public events are scheduled right now.</p>
      ) : (
        <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface px-5">
          {events.map((e) => (
            <EventRow key={`${e.clan?.slug}-${e.id}`} event={e} site={site} />
          ))}
        </ul>
      )}
    </div>
  );
}
