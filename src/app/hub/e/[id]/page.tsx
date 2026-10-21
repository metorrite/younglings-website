import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { gateHub } from "@/components/clanshub/gate";
import { HubEventBadge } from "@/components/clanshub/HubEventParts";
import { Unavailable } from "@/components/clanshub/parts";
import { LocalTime } from "@/components/site/LocalTime";
import { authOptions } from "@/lib/auth";
import { eventsHubOn, hubEngineEvent } from "@/lib/hubEvents";
import { hubHref } from "@/lib/siteHosts";
import { currentSite } from "@/lib/siteHostsServer";
import { JoinPanel } from "./JoinPanel";

export const metadata: Metadata = { title: "Event", description: "An open event on the events hub." };
export const dynamic = "force-dynamic";

const PRIZE_KIND: Record<string, string> = { IN_GAME: "gp", CLAN_POINTS: "clan points", OTHER: "" };

/** One event of the events hub (T-217): what it is, who hosts it, the prizes, the standings when the host shows them, and Join. Never who is in it. */
export default async function HubEventPage({ params }: { params: Promise<{ id: string }> }) {
  const closed = await gateHub();
  if (closed) return closed;
  if (!eventsHubOn()) notFound();
  const { id } = await params;
  const site = await currentSite();
  const session = await getServerSession(authOptions);
  const viewer = session?.user?.id ?? null;
  const event = await hubEngineEvent(id, viewer);
  if (event === undefined) notFound();
  if (event === null) return <Unavailable />;

  const here = hubHref(site, `/e/${event.id}`);
  const signInHref = `/api/auth/signin?callbackUrl=${encodeURIComponent(here)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href={hubHref(site, "/events")} className="text-sm text-muted hover:text-foreground">
        ← All events
      </Link>
      <header className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">{event.templateLabel}</p>
        <h1 className="text-4xl font-semibold tracking-tight break-words">{event.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <HubEventBadge event={event} />
          <span>
            Hosted by{" "}
            {event.host.slug ? (
              <Link href={hubHref(site, `/c/${event.host.slug}`)} className="font-medium text-foreground hover:underline">
                {event.host.name}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{event.host.name}</span>
            )}
          </span>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">Starts</dt>
            <dd>{event.startsAt ? <LocalTime iso={event.startsAt} /> : "Not set yet"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Ends</dt>
            <dd>{event.endsAt ? <LocalTime iso={event.endsAt} /> : "Not set yet"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Players</dt>
            <dd className="tabular-nums">
              {event.players}
              {event.maxParticipants > 0 ? ` of ${event.maxParticipants}` : ""} {event.scoringMode === "TEAM" ? "(in teams)" : ""}
            </dd>
          </div>
        </dl>
      </header>

      <section className="space-y-3 rounded-2xl border border-surface-border bg-surface p-5">
        <h2 className="font-semibold">Take part</h2>
        <p className="text-sm text-muted">Players take part from the host&apos;s Discord server, so you&apos;ll need to join it. Your Discord name is never shown here.</p>
        <JoinPanel eventId={event.id} signedIn={viewer !== null} signInHref={signInHref} open={event.signupsOpen} hostName={event.host.name} needsRsn={event.needsRsn} />
      </section>

      {event.description && (
        <section className="space-y-2">
          <h2 className="font-semibold">About and rules</h2>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{event.description}</p>
        </section>
      )}

      {event.prizes.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Prizes</h2>
          <ul className="space-y-1 text-sm">
            {event.prizes.map((p, i) => (
              <li key={i}>
                <span className="text-muted">{p.place === p.placeTo ? `#${p.place}` : `#${p.place} to #${p.placeTo}`}:</span> {p.description || (p.amount > 0 ? `${p.amount.toLocaleString("en-GB")} ${PRIZE_KIND[p.kind] ?? ""}` : "A prize")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {event.standings && event.standings.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Standings</h2>
          <ol className="divide-y divide-surface-border/60 rounded-2xl border border-surface-border text-sm">
            {event.standings.map((r) => (
              <li key={r.rank} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="min-w-0 break-words">
                  <span className="mr-2 tabular-nums text-muted">{r.rank}.</span>
                  {r.name}
                </span>
                <span className="shrink-0 tabular-nums">{r.points.toLocaleString("en-GB")} pts</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
