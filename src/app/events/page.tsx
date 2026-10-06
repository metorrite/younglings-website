import { LocalTime } from "@/components/site/LocalTime";
import { PageHeader, Unavailable } from "@/components/site/blocks";
import { getEvents, type SiteEvent } from "@/lib/site";

export const metadata = { title: "Events — Younglings" };
// Rendered per request: the data comes from the bot over a private network that doesn't exist at build time,
// so prerendering would bake in an empty "unavailable" page. The fetches themselves are still cached briefly.
export const dynamic = "force-dynamic";

function StatusPill({ event }: { event: SiteEvent }) {
  if (event.status === "ACTIVE") {
    return <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">Live now</span>;
  }
  return (
    <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold">
      <LocalTime iso={event.startTime} mode="relative" />
    </span>
  );
}

function Featured({ event }: { event: SiteEvent }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gold/30 bg-surface shadow-[0_0_60px_rgba(212,175,55,0.08)] md:grid md:grid-cols-[minmax(0,26rem)_1fr]">
      {event.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Discord's CDN event cover; remote size varies
        <img src={event.imageUrl} alt="" className="h-56 w-full object-cover md:h-full" />
      ) : (
        <div className="flex h-56 items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.25),transparent_70%)] text-5xl md:h-full">🗓️</div>
      )}
      <div className="flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-widest text-gold uppercase">Next event</span>
          <StatusPill event={event} />
        </div>
        <h2 className="text-2xl font-bold">
          <a href={event.url} target="_blank" rel="noreferrer" className="transition hover:text-gold">
            {event.name} ↗
          </a>
        </h2>
        <p className="text-sm font-medium text-foreground/90">
          <LocalTime iso={event.startTime} />
          {event.location && <span className="text-muted"> · {event.location}</span>}
        </p>
        {event.description && <p className="max-w-prose text-sm whitespace-pre-line text-muted">{event.description}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-4 pt-2 text-sm">
          <a href={event.url} target="_blank" rel="noreferrer" className="rounded-md bg-[#5865F2] px-4 py-2 font-semibold text-white transition hover:bg-[#4752c4]">
            Open in Discord
          </a>
          {event.interestedCount >= 0 && <span className="text-muted">{event.interestedCount} interested</span>}
        </div>
      </div>
    </article>
  );
}

function EventCard({ event }: { event: SiteEvent }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-surface-border bg-surface/90 transition hover:border-gold/40">
      {event.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- Discord's CDN event cover; remote size varies
        <img src={event.imageUrl} alt="" className="h-32 w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold">
            <a href={event.url} target="_blank" rel="noreferrer" className="transition hover:text-gold">
              {event.name} ↗
            </a>
          </h3>
          <StatusPill event={event} />
        </div>
        <p className="text-xs text-muted">
          <LocalTime iso={event.startTime} />
          {event.location && <> · {event.location}</>}
        </p>
        {event.description && <p className="line-clamp-3 text-sm whitespace-pre-line text-muted">{event.description}</p>}
        {event.interestedCount >= 0 && <p className="mt-auto pt-1 text-xs text-muted">{event.interestedCount} interested</p>}
      </div>
    </article>
  );
}

export default async function EventsPage() {
  const events = await getEvents();
  const [next, ...rest] = events ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader title="Events" subtitle="What's coming up in the Younglings Discord. Times are shown in your own timezone; click an event to open it in Discord." />

      {events === null ? (
        <Unavailable what="Events" />
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">No events are scheduled right now — check back soon.</div>
      ) : (
        <div className="space-y-8">
          <Featured event={next} />
          {rest.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold tracking-wide text-gold uppercase">Coming up</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
