import Link from "next/link";
import { gateHub } from "@/components/clanshub/gate";
import { ClanCard, ClanMark, compact, EventCard, SectionHeader, Stat, Unavailable } from "@/components/clanshub/parts";
import { allEvents, clanAccent, FOCUSES, leaderboard, listClans, msUntil, RECRUITING, withAlpha } from "@/lib/clansHub";
import { currentSite } from "@/lib/siteHostsServer";
import { hubHref } from "@/lib/siteHosts";

export const dynamic = "force-dynamic";

const SORTS = [
  { key: "members", label: "Most members" },
  { key: "name", label: "A to Z" },
] as const;

type Params = { q?: string; recruiting?: string; focus?: string; sort?: string };

export default async function ClansHubHome({ searchParams }: { searchParams: Promise<Params> }) {
  const closed = await gateHub();
  if (closed) return closed;
  const params = await searchParams;
  const site = await currentSite();
  const q = (params.q ?? "").slice(0, 60);
  const recruiting = RECRUITING.some((r) => r.key === params.recruiting) ? params.recruiting : undefined;
  const focus = FOCUSES.some((f) => f.key === params.focus) ? params.focus : undefined;
  const sort = SORTS.some((s) => s.key === params.sort) ? (params.sort as (typeof SORTS)[number]["key"]) : "recommended";
  const filtered = Boolean(q || recruiting || focus);

  const [all, found, events, week] = await Promise.all([listClans(), listClans({ q, recruiting, focus }), allEvents(), leaderboard("week")]);
  // Recommended: clans taking members first, then the biggest.
  const ordered = found
    ? [...found].sort(
        sort === "name"
          ? (a, b) => a.name.localeCompare(b.name)
          : sort === "members"
            ? (a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0)
            : (a, b) => Number(b.recruiting.key === "OPEN") - Number(a.recruiting.key === "OPEN") || (b.memberCount ?? 0) - (a.memberCount ?? 0),
      )
    : null;

  const link = (patch: Partial<Params>) => {
    const next = { q, recruiting, focus, sort: sort === "recommended" ? undefined : sort, ...patch };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
    const text = qs.toString();
    return hubHref(site, "/") + (text ? `?${text}` : "");
  };
  const countRecruiting = (key: string) => all?.filter((c) => c.recruiting.key === key).length ?? 0;
  const countFocus = (key: string) => all?.filter((c) => c.focus.some((f) => f.key === key)).length ?? 0;

  const recruitingNow = all?.filter((c) => c.recruiting.key === "OPEN").length ?? 0;
  const totalXp = week?.reduce((sum, e) => sum + e.xpGained, 0) ?? 0;
  const soon = events?.filter((e) => e.status === "ACTIVE" || msUntil(e.startTime) < 7 * 24 * 3600 * 1000).length ?? 0;
  const topWeek = week?.slice(0, 5) ?? [];
  const topXp = topWeek[0]?.xpGained ?? 1;

  const chip = (active: boolean) =>
    `flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm transition ${active ? "bg-gold/15 font-medium text-gold" : "text-muted hover:bg-white/5 hover:text-foreground"}`;

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">RuneScape 3 clans</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Find a clan that fits how you play</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">Browse clans that chose to be listed: who is recruiting, what they focus on, what they have coming up and how they rank.</p>
          <form method="get" role="search" className="mt-6 flex max-w-xl gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by name or tagline"
              aria-label="Search clans"
              className="min-w-0 flex-1 rounded-xl border border-surface-border bg-surface px-4 py-3 text-base placeholder:text-muted/70 focus:border-gold focus:outline-none"
            />
            {recruiting && <input type="hidden" name="recruiting" value={recruiting} />}
            {focus && <input type="hidden" name="focus" value={focus} />}
            <button type="submit" className="rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110">
              Search
            </button>
          </form>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            Popular:
            {["PVM", "NEW_PLAYERS", "IRONMAN", "EVENTS"].map((key) => (
              <Link key={key} href={link({ focus: key, q: undefined })} className="rounded-full border border-surface-border px-3 py-1 text-xs text-foreground/80 transition hover:border-gold/60 hover:text-gold">
                {FOCUSES.find((f) => f.key === key)?.label}
              </Link>
            ))}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Clans listed" value={all?.length ?? "–"} accent="#d4af37" />
          <Stat label="Recruiting now" value={recruitingNow} accent="#34d399" />
          <Stat label="Events this week" value={soon} accent="#818cf8" />
          <Stat label="XP gained this week" value={totalXp > 0 ? compact(totalXp) : "–"} hint="across ranked clans" accent="#f472b6" />
        </div>
      </section>

      <section aria-label="Clans" id="clans" className="grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside aria-label="Filters" className="space-y-6 lg:sticky lg:top-24">
          <div>
            <h2 className="px-3 pb-1.5 text-xs font-semibold tracking-wider text-muted uppercase">Recruiting</h2>
            <ul className="flex flex-wrap gap-1 lg:block lg:space-y-0.5">
              <li>
                <Link href={link({ recruiting: undefined })} aria-current={!recruiting ? "true" : undefined} className={chip(!recruiting)}>
                  Any <span className="text-xs tabular-nums">{all?.length ?? 0}</span>
                </Link>
              </li>
              {RECRUITING.map((r) => (
                <li key={r.key}>
                  <Link href={link({ recruiting: recruiting === r.key ? undefined : r.key })} aria-current={recruiting === r.key ? "true" : undefined} className={chip(recruiting === r.key)}>
                    {r.label} <span className="text-xs tabular-nums">{countRecruiting(r.key)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="px-3 pb-1.5 text-xs font-semibold tracking-wider text-muted uppercase">Focus</h2>
            <ul className="flex flex-wrap gap-1 lg:block lg:space-y-0.5">
              {FOCUSES.map((f) => (
                <li key={f.key}>
                  <Link href={link({ focus: focus === f.key ? undefined : f.key })} aria-current={focus === f.key ? "true" : undefined} className={chip(focus === f.key)}>
                    {f.label} <span className="text-xs tabular-nums">{countFocus(f.key)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted tabular-nums" aria-live="polite">
              {ordered ? (
                <>
                  <span className="font-semibold text-foreground">{ordered.length}</span> {ordered.length === 1 ? "clan" : "clans"}
                  {filtered && (
                    <>
                      {" "}
                      match.{" "}
                      <Link href={hubHref(site, "/")} className="text-gold hover:underline">
                        Clear filters
                      </Link>
                    </>
                  )}
                </>
              ) : null}
            </p>
            <div className="flex items-center gap-1 text-sm" role="group" aria-label="Sort">
              <span className="mr-1 text-muted">Sort</span>
              {[{ key: "recommended", label: "Recommended" }, ...SORTS].map((s) => (
                <Link key={s.key} href={link({ sort: s.key === "recommended" ? undefined : s.key })} aria-current={sort === s.key ? "true" : undefined} className={`rounded-lg px-2.5 py-1 transition ${sort === s.key ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"}`}>
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
          {ordered === null ? (
            <Unavailable />
          ) : ordered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">
              {filtered ? "No clan matches that. Try fewer filters." : "No clans are listed yet. Be the first: switch your clan profile to public from the JonnyBot dashboard."}
            </p>
          ) : (
            <ul className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 19rem), 1fr))" }}>
              {ordered.map((c) => (
                <ClanCard key={c.slug} clan={c} site={site} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {!filtered && (
        <div className="grid gap-10 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section aria-label="Upcoming events" className="space-y-4">
            <SectionHeader title="Coming up" hint="Public events from listed clans." href={hubHref(site, "/events")} hrefLabel="All events" />
            {events === null || events.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-surface-border p-6 text-sm text-muted">No public events are scheduled right now.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {events.slice(0, 4).map((e) => (
                  <EventCard key={`${e.clan?.slug}-${e.id}`} event={e} site={site} />
                ))}
              </ul>
            )}
          </section>

          <section aria-label="This week's top clans" className="space-y-4">
            <SectionHeader title="Top this week" hint="Ranked by XP the members gained." href={hubHref(site, "/leaderboards")} hrefLabel="Leaderboards" />
            {topWeek.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-surface-border p-6 text-sm text-muted">No clan has joined the leaderboard yet.</p>
            ) : (
              <ol className="space-y-2">
                {topWeek.map((e) => {
                  const colour = clanAccent(e);
                  return (
                    <li key={e.slug}>
                      <Link href={hubHref(site, `/c/${e.slug}`)} className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-surface-border bg-surface px-3 py-2.5 transition hover:border-white/20">
                        <span aria-hidden className="absolute inset-y-0 left-0" style={{ width: `${Math.max(8, (e.xpGained / topXp) * 100)}%`, backgroundColor: withAlpha(colour, 0.13) }} />
                        <span className="relative w-6 text-center text-sm font-semibold text-muted tabular-nums">{e.rank}</span>
                        <span className="relative">
                          <ClanMark clan={e} size={32} />
                        </span>
                        <span className="relative min-w-0 flex-1 truncate font-medium">{e.name}</span>
                        <span className="relative shrink-0 text-sm text-muted tabular-nums">{compact(e.xpGained)} XP</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
