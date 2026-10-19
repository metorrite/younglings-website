import type { Metadata } from "next";
import { gateHub } from "@/components/clanshub/gate";
import { EventCard, SectionHeader, Stat, Unavailable } from "@/components/clanshub/parts";
import { allEvents, msUntil, type HubEvent } from "@/lib/clansHub";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata: Metadata = { title: "Events", description: "Upcoming events that clans have chosen to share publicly." };
export const dynamic = "force-dynamic";

const DAY = 24 * 3600 * 1000;

export default async function HubEvents() {
  const closed = await gateHub();
  if (closed) return closed;
  const site = await currentSite();
  const events = await allEvents();

  const live = events?.filter((e) => e.status === "ACTIVE") ?? [];
  const today = events?.filter((e) => e.status !== "ACTIVE" && msUntil(e.startTime) < DAY) ?? [];
  const week = events?.filter((e) => e.status !== "ACTIVE" && msUntil(e.startTime) >= DAY && msUntil(e.startTime) < 7 * DAY) ?? [];
  const later = events?.filter((e) => e.status !== "ACTIVE" && msUntil(e.startTime) >= 7 * DAY) ?? [];
  const clans = new Set(events?.map((e) => e.clan?.slug)).size;
  const groups: { title: string; hint: string; items: HubEvent[] }[] = [
    { title: "Happening now", hint: "Under way right now.", items: live },
    { title: "Next 24 hours", hint: "Starting soon.", items: today },
    { title: "This week", hint: "In the next seven days.", items: week },
    { title: "Later", hint: "Further ahead.", items: later },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-10">
      <header className="grid items-end gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">Events</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">What clans are running</h1>
          <p className="mt-3 max-w-xl text-lg text-muted">Public events, soonest first. Times are shown in your own timezone.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Upcoming" value={events?.length ?? "–"} accent="#818cf8" />
          <Stat label="Live now" value={live.length} accent="#34d399" />
          <Stat label="Clans hosting" value={clans || "–"} accent="#d4af37" />
        </div>
      </header>

      {events === null ? (
        <Unavailable />
      ) : events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">No public events are scheduled right now.</p>
      ) : (
        groups.map((g) => (
          <section key={g.title} className="space-y-4">
            <SectionHeader title={g.title} hint={g.hint} />
            <ul className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 24rem), 1fr))" }}>
              {g.items.map((e) => (
                <EventCard key={`${e.clan?.slug}-${e.id}`} event={e} site={site} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
