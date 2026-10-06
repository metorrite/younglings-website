import Link from "next/link";
import { PageHeader, Panel, Unavailable } from "@/components/site/blocks";
import { DiscordLink } from "@/components/site/DiscordLink";
import { LocalTime } from "@/components/site/LocalTime";
import { discordPath, getEvents, monthLabel, type SiteEvent } from "@/lib/site";

export const metadata = { title: "Event calendar — Younglings" };
export const dynamic = "force-dynamic";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (n: number) => String(n).padStart(2, "0");

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const query = await searchParams;
  const now = new Date();
  const requested = typeof query.month === "string" && /^\d{4}-\d{2}$/.test(query.month) ? query.month : `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`;
  const [year, month] = requested.split("-").map(Number);

  const events = await getEvents();
  const byDay = new Map<string, SiteEvent[]>();
  events?.forEach((e) => {
    const key = e.startTime.slice(0, 10); // the UTC day
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  });

  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = new Date(Date.UTC(year, month - 2, 1));
  const next = new Date(Date.UTC(year, month, 1));
  const monthParam = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  const today = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Event calendar" subtitle="Upcoming Discord events by day (dates shown in UTC; times are in your own timezone).">
        <Link href="/events" className="text-sm text-muted hover:text-foreground">
          ← Event list
        </Link>
      </PageHeader>

      <div className="flex items-center gap-3">
        <Link href={`/events/calendar?month=${monthParam(prev)}`} className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold/50">
          ←
        </Link>
        <h2 className="min-w-44 text-center text-xl font-semibold text-gold">{monthLabel(requested)}</h2>
        <Link href={`/events/calendar?month=${monthParam(next)}`} className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold/50">
          →
        </Link>
      </div>

      {events === null ? (
        <Unavailable what="The calendar" />
      ) : (
        <Panel className="p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-surface-border bg-surface-border text-sm">
            {WEEKDAYS.map((d) => (
              <div key={d} className="bg-surface px-2 py-1.5 text-center text-xs tracking-wider text-muted uppercase">
                {d}
              </div>
            ))}
            {cells.map((day, i) => {
              const key = day ? `${year}-${pad(month)}-${pad(day)}` : "";
              const dayEvents = day ? byDay.get(key) ?? [] : [];
              return (
                <div key={i} className={`min-h-24 bg-background/70 p-1.5 ${day ? "" : "opacity-40"}`}>
                  {day && (
                    <>
                      <span className={`text-xs ${key === today ? "rounded-full bg-gold px-1.5 py-0.5 font-bold text-background" : "text-muted"}`}>{day}</span>
                      <ul className="mt-1 space-y-1">
                        {dayEvents.map((e) => (
                          <li key={e.id}>
                            <DiscordLink path={discordPath(e.url)} className="block truncate rounded bg-gold/15 px-1.5 py-0.5 text-[11px] text-gold hover:bg-gold/25" title={e.name}>
                              <LocalTime iso={e.startTime} mode="clock" /> {e.name}
                            </DiscordLink>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
