import { formatEventWhen, getUpcomingEvents } from "@/lib/jonnybot";

export async function UpcomingEventsCard() {
  const events = await getUpcomingEvents();

  return (
    <div className="rounded-lg border border-surface-border bg-surface p-6">
      <h2 className="font-semibold text-gold">Upcoming Events</h2>

      {events === null ? (
        <p className="mt-2 text-sm text-muted">
          Not connected to JonnyBot yet — set up the internal API to see this live.
        </p>
      ) : events.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No scheduled events right now.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="rounded-md border border-surface-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{event.name}</span>
                <span className="shrink-0 rounded bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold">
                  {formatEventWhen(event.startTime)}
                </span>
              </div>
              {event.location && <p className="mt-1 text-xs text-muted">{event.location}</p>}
              {event.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted">{event.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
