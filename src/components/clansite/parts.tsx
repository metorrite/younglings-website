import type { HubEvent } from "@/lib/clansHub";
import type { Recap } from "@/lib/site";

const number = new Intl.NumberFormat("en-GB");
const compact = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });
const when = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export const fmt = (n: number) => number.format(n);
export const fmtCompact = (n: number) => compact.format(n);

/** The clan's shared events, soonest first, as the hub shows them (times in UTC, which is game time). */
export function EventList({ events, empty }: { events: HubEvent[]; empty: string }) {
  if (events.length === 0) return <p className="text-sm text-[var(--cs-muted)]">{empty}</p>;
  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="flex flex-col gap-0.5">
          <a href={e.url} rel="noopener noreferrer" target="_blank" className="font-medium hover:text-[var(--cs-primary)]">
            {e.name}
          </a>
          <span className="text-xs text-[var(--cs-muted)]">
            {when.format(new Date(e.startTime))} game time{e.location ? ` · ${e.location}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A few clan-level lines from a recap (the clan's totals and its busiest members, who appear only if they haven't opted out). */
export function RecapSummary({ recap }: { recap: Recap }) {
  const lines: [string, string][] = [
    ["XP gained", fmtCompact(recap.xp.total)],
    ["Active members", recap.activeMembers !== undefined ? fmt(recap.activeMembers) : "–"],
  ];
  if (!recap.activity.hidden) lines.push(["Boss kills", fmt(recap.activity.bossKills)], ["Level-ups", fmt(recap.activity.levelUps)]);
  if (recap.roster) lines.push(["Joined / left", `${recap.roster.joined} / ${recap.roster.left}`]);
  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-wide text-[var(--cs-muted)]">{recap.period.label}</p>
      <dl className="grid grid-cols-2 gap-3">
        {lines.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-[var(--cs-muted)]">{label}</dt>
            <dd className="text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {recap.topGainers && recap.topGainers.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-[var(--cs-muted)]">Top XP</p>
          <ol className="space-y-0.5 text-sm">
            {recap.topGainers.slice(0, 3).map((g) => (
              <li key={g.rsn} className="flex justify-between gap-4">
                <span>{g.rsn}</span>
                <span className="text-[var(--cs-muted)]">{fmtCompact(g.xp)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function Unavailable() {
  return <p className="text-sm text-[var(--cs-muted)]">This can&apos;t be shown right now. Please try again in a few minutes.</p>;
}
