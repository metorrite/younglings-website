import Link from "next/link";
import { LocalDateTile } from "@/components/clanshub/LocalDateTile";
import { LocalTime } from "@/components/site/LocalTime";
import { clanAccent } from "@/lib/clansHub";
import type { HubEngineEvent } from "@/lib/hubEvents";
import { hubHref, type SiteInfo } from "@/lib/siteHosts";

/** How an event of the events hub stands, in a few words. */
export function hubEventState(e: HubEngineEvent): { text: string; tone: "open" | "live" | "done" | "plain" } {
  if (e.status === "SIGNUPS") return e.signupsOpen ? { text: "Signups open", tone: "open" } : { text: "Signups closed", tone: "plain" };
  if (e.status === "RUNNING") return { text: "Happening now", tone: "live" };
  return { text: "Finished", tone: "done" };
}

const TONE: Record<string, string> = {
  open: "border-gold/60 bg-gold/10 text-gold",
  live: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  done: "border-surface-border text-muted",
  plain: "border-surface-border text-muted",
};

export function HubEventBadge({ event }: { event: HubEngineEvent }) {
  const state = hubEventState(event);
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${TONE[state.tone]}`}>{state.text}</span>;
}

/** A card of the events hub's list: the event and its host, never who is in it. */
export function HubEngineEventCard({ event, site }: { event: HubEngineEvent; site: SiteInfo }) {
  const colour = clanAccent({ slug: event.host.slug ?? event.host.guildId, name: event.host.name, colour: null });
  const href = hubHref(site, `/e/${event.id}`);
  return (
    <li className="flex items-start gap-4 rounded-2xl border border-surface-border bg-surface p-4 transition hover:border-white/20">
      {event.startsAt ? <LocalDateTile iso={event.startsAt} accent={colour} /> : <div className="h-14 w-14 shrink-0 rounded-xl border border-surface-border" aria-hidden />}
      <div className="min-w-0 flex-1">
        <Link href={href} className="font-semibold break-words hover:underline" style={{ textDecorationColor: colour }}>
          {event.name}
        </Link>
        <p className="mt-0.5 text-sm text-muted">
          {event.templateLabel} · {event.host.name}
          {event.startsAt && (
            <>
              {" · "}
              <LocalTime iso={event.startsAt} />
            </>
          )}
        </p>
        {event.summary && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{event.summary}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <HubEventBadge event={event} />
          <span className="text-muted tabular-nums">
            {event.players}
            {event.maxParticipants > 0 ? ` / ${event.maxParticipants}` : ""} {event.scoringMode === "TEAM" ? "players in teams" : "players"}
          </span>
          {event.needsRsn && <span className="rounded-full border border-surface-border px-2 py-0.5 text-muted">Needs a linked RuneScape name</span>}
          {event.access === "ALLIANCE" && <span className="rounded-full border border-indigo-400/50 px-2 py-0.5 text-indigo-300">Alliance</span>}
          {event.access === "MINE" && <span className="rounded-full border border-surface-border px-2 py-0.5 text-muted">Your server</span>}
        </div>
      </div>
    </li>
  );
}
