import Link from "next/link";
import { gateHub } from "@/components/clanshub/gate";
import { ClanCard, EventRow, Unavailable } from "@/components/clanshub/parts";
import { allEvents, FOCUSES, leaderboard, listClans, RECRUITING } from "@/lib/clansHub";
import { currentSite } from "@/lib/siteHostsServer";
import { hubHref } from "@/lib/siteHosts";

export const dynamic = "force-dynamic";

const field = "rounded-lg border border-surface-border bg-background px-3 py-2 text-sm";

export default async function ClansHubHome({ searchParams }: { searchParams: Promise<{ q?: string; recruiting?: string; focus?: string }> }) {
  const closed = await gateHub();
  if (closed) return closed;
  const params = await searchParams;
  const site = await currentSite();
  const q = (params.q ?? "").slice(0, 60);
  const recruiting = RECRUITING.some((r) => r.key === params.recruiting) ? params.recruiting : undefined;
  const focus = FOCUSES.some((f) => f.key === params.focus) ? params.focus : undefined;
  const filtered = Boolean(q || recruiting || focus);

  const [clans, events, week] = await Promise.all([listClans({ q, recruiting, focus }), filtered ? null : allEvents(), filtered ? null : leaderboard("week")]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Find a clan</h1>
        <p className="mt-2 max-w-2xl text-muted">RuneScape 3 clans that have chosen to be listed: who is recruiting, what they focus on, and what they have coming up.</p>
        <form method="get" className="mt-5 flex flex-wrap gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="Search by name or tagline" aria-label="Search clans" className={`${field} w-full sm:w-72`} />
          <select name="recruiting" defaultValue={recruiting ?? ""} aria-label="Recruiting" className={field}>
            <option value="">Any recruiting status</option>
            {RECRUITING.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          <select name="focus" defaultValue={focus ?? ""} aria-label="Focus" className={field}>
            <option value="">Any focus</option>
            {FOCUSES.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg border border-gold/60 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
            Search
          </button>
          {filtered && (
            <Link href={hubHref(site, "/")} className="px-2 py-2 text-sm text-muted hover:text-foreground">
              Clear
            </Link>
          )}
        </form>
      </section>

      <section aria-label="Clans">
        {clans === null ? (
          <Unavailable />
        ) : clans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-border p-8 text-center text-sm text-muted">
            {filtered ? "No clan matches that search." : "No clans are listed yet. Be the first: switch your clan profile to public from the JonnyBot dashboard."}
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted tabular-nums">{clans.length} {clans.length === 1 ? "clan" : "clans"}</p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clans.map((c) => (
                <ClanCard key={c.slug} clan={c} site={site} />
              ))}
            </ul>
          </>
        )}
      </section>

      {!filtered && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section aria-label="Upcoming events">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Coming up</h2>
              <Link href={hubHref(site, "/events")} className="text-sm text-gold hover:underline">
                All events
              </Link>
            </div>
            {events === null || events.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No public events are scheduled right now.</p>
            ) : (
              <ul className="mt-2 divide-y divide-surface-border">
                {events.slice(0, 5).map((e) => (
                  <EventRow key={`${e.clan?.slug}-${e.id}`} event={e} site={site} />
                ))}
              </ul>
            )}
          </section>

          <section aria-label="This week's top clans">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Top this week</h2>
              <Link href={hubHref(site, "/leaderboards")} className="text-sm text-gold hover:underline">
                Leaderboards
              </Link>
            </div>
            {week === null || week.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No clan has joined the leaderboard yet.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {week.slice(0, 3).map((e) => (
                  <li key={e.slug} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="mr-2 text-muted tabular-nums">{e.rank}.</span>
                      <Link href={hubHref(site, `/c/${e.slug}`)} className="hover:text-gold hover:underline">
                        {e.name}
                      </Link>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">{e.xpGained.toLocaleString("en-GB")} XP</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
