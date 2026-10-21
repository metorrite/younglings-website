import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { gateHub } from "@/components/clanshub/gate";
import { HubEngineEventCard } from "@/components/clanshub/HubEventParts";
import { authOptions } from "@/lib/auth";
import { eventsHubOn, hubEngineEvents, type HubAccess } from "@/lib/hubEvents";
import { hubHref, type SiteInfo } from "@/lib/siteHosts";
import { EventCard, SectionHeader, Stat, Unavailable } from "@/components/clanshub/parts";
import { allEvents, msUntil, type HubEvent } from "@/lib/clansHub";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata: Metadata = { title: "Events", description: "Upcoming events that clans have chosen to share publicly." };
export const dynamic = "force-dynamic";

const DAY = 24 * 3600 * 1000;

/** The events hub's tabs (T-217): open events, alliance events and your own servers' (engine events), and the Discord events clans share. */
const TABS: { key: string; label: string; access?: HubAccess }[] = [
  { key: "open", label: "Open events", access: "PUBLIC" },
  { key: "alliance", label: "Alliance", access: "ALLIANCE" },
  { key: "mine", label: "My servers", access: "MINE" },
  { key: "discord", label: "Discord events" },
];

export default async function HubEvents({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const closed = await gateHub();
  if (closed) return closed;
  const site = await currentSite();
  if (!eventsHubOn()) return <DiscordEvents site={site} />;
  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.key === rawTab) ?? TABS[0];
  const session = await getServerSession(authOptions);
  const viewer = session?.user?.id ?? null;
  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap gap-2" aria-label="Kinds of event">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={hubHref(site, t.key === "open" ? "/events" : `/events?tab=${t.key}`)}
            aria-current={t.key === tab.key ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm ${t.key === tab.key ? "border-gold bg-gold/10 text-gold" : "border-surface-border text-muted hover:text-foreground"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab.access ? <EngineEvents site={site} access={tab.access} viewer={viewer} /> : <DiscordEvents site={site} />}
    </div>
  );
}

const EMPTY: Record<HubAccess, string> = {
  PUBLIC: "No open events right now. Clans and communities using JonnyBot can open theirs to everyone from their dashboard.",
  ALLIANCE: "No alliance events for you right now.",
  MINE: "None of your servers has an event on the hub right now.",
};

async function EngineEvents({ site, access, viewer }: { site: SiteInfo; access: HubAccess; viewer: string | null }) {
  if (access !== "PUBLIC" && !viewer) {
    return (
      <p className="rounded-2xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">
        <a href={`/api/auth/signin?callbackUrl=${encodeURIComponent(hubHref(site, `/events?tab=${access === "ALLIANCE" ? "alliance" : "mine"}`))}`} className="text-gold underline">
          Sign in with Discord
        </a>{" "}
        to see {access === "ALLIANCE" ? "events of servers allied with yours" : "your own servers' events"}.
      </p>
    );
  }
  const all = await hubEngineEvents(viewer);
  if (all === null) return <Unavailable />;
  const events = all.filter((e) => e.access === access);
  if (events.length === 0) return <p className="rounded-2xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">{EMPTY[access]}</p>;
  return (
    <ul className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 24rem), 1fr))" }}>
      {events.map((e) => (
        <HubEngineEventCard key={e.id} event={e} site={site} />
      ))}
    </ul>
  );
}

/** The Discord scheduled events clans share (what this page always showed). */
async function DiscordEvents({ site }: { site: SiteInfo }) {
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
