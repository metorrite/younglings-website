import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gateHub } from "@/components/clanshub/gate";
import { ClanMark, compact, EventCard, FocusChips, RecruitingBadge, SectionHeader, Stat, Unavailable, VerifiedTick } from "@/components/clanshub/parts";
import { ReportClan } from "@/components/clanshub/ReportClan";
import { clanAccent, clanEvents, getClan, leaderboard, withAlpha } from "@/lib/clansHub";
import { canSeeHub } from "@/lib/hubAccess";
import { eventsHubOn } from "@/lib/hubEvents";
import { hubHref } from "@/lib/siteHosts";
import { currentSite } from "@/lib/siteHostsServer";

/** What the clans played in a clan-vs-clan event (T-223). */
const GAME: Record<string, string> = { bingo: "Bingo", competition: "XP competition", "boss-night": "Boss night", "scavenger-hunt": "Scavenger hunt" };

/** 1st, 2nd, 3rd, 4th, ..., 11th, 12th, 13th, 21st. */
function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!(await canSeeHub())) return { title: "Clans Hub" };
  const clan = await getClan(slug);
  return clan ? { title: clan.name, description: clan.tagline || `${clan.name} on the Clans Hub` } : { title: "Clan" };
}

/** Only an http(s) link is offered as the apply button, whatever a clan typed. */
function safeUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function ClanPage({ params }: { params: Promise<{ slug: string }> }) {
  const closed = await gateHub();
  if (closed) return closed;
  const { slug } = await params;
  const site = await currentSite();
  const clan = await getClan(slug);
  if (clan === undefined) notFound();
  if (clan === null)
    return (
      <div className="space-y-4">
        <Unavailable />
      </div>
    );

  const [events, week] = await Promise.all([clanEvents(slug), leaderboard("week")]);
  // Apply: the clan's own application (join its Discord, then its web form) when it set one up; else its apply link, if any.
  const recruiting = clan.recruitingPost;
  const applyHere = recruiting && (recruiting.applyFormPath || recruiting.inviteUrl) ? hubHref(site, `/c/${clan.slug}/apply`) : null;
  const apply = applyHere ?? safeUrl(clan.applyUrl);
  const applyExternal = !applyHere;
  const colour = clanAccent(clan);
  const ranked = week?.find((e) => e.slug === clan.slug) ?? null;

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href={hubHref(site, "/")} className="hover:text-foreground hover:underline">
          Clans
        </Link>{" "}
        / <span className="text-foreground">{clan.name}</span>
      </nav>

      <header className="overflow-hidden rounded-3xl border border-surface-border bg-surface">
        <div
          className="h-40 sm:h-52"
          style={{ background: `radial-gradient(90% 150% at 10% 0%, ${withAlpha(colour, 0.6)}, transparent 65%), radial-gradient(70% 120% at 100% 100%, ${withAlpha(colour, 0.25)}, transparent 70%), linear-gradient(135deg, ${withAlpha(colour, 0.2)}, ${withAlpha(colour, 0.03)})` }}
        />
        <div className="flex flex-wrap items-end gap-5 px-6 pb-6 sm:px-8">
          <div className="-mt-14 sm:-mt-16">
            <ClanMark clan={clan} size={112} ring />
          </div>
          <div className="min-w-0 flex-1 pt-3">
            <h1 className="text-3xl font-semibold tracking-tight break-words sm:text-4xl">{clan.name}</h1>
            {clan.tagline && <p className="mt-1 max-w-2xl text-lg break-words text-muted">{clan.tagline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <RecruitingBadge clan={clan} />
              <VerifiedTick clan={clan} />
              {!clan.listed && <span className="text-xs text-muted">Unlisted: only people with this link can see it</span>}
            </div>
          </div>
          {apply && (
            <a href={apply} {...(applyExternal ? { target: "_blank", rel: "noreferrer noopener" } : {})} className="shrink-0 rounded-xl px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110" style={{ backgroundColor: colour }}>
              {applyHere ? "Apply to join" : "How to apply"}
            </a>
          )}
        </div>
      </header>

      <section aria-label="Numbers" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Members" value={clan.memberCount ?? "–"} accent={colour} />
        <Stat label="Weekly rank" value={ranked ? `#${ranked.rank}` : "–"} hint={ranked ? `of ${week?.length} ranked clans` : "Not on the leaderboard"} accent={colour} />
        <Stat label="XP this week" value={ranked ? compact(ranked.xpGained) : "–"} accent={colour} />
        <Stat label="Per member" value={ranked ? compact(ranked.perMember) : "–"} hint="average XP gained" accent={colour} />
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          {recruiting?.post && clan.recruiting.key !== "CLOSED" && (
            <section className="rounded-2xl border p-6" style={{ borderColor: withAlpha(colour, 0.5), background: withAlpha(colour, 0.06) }}>
              <h2 className="text-lg font-semibold">What they&apos;re looking for</h2>
              <p className="mt-3 break-words whitespace-pre-wrap text-muted">{recruiting.post}</p>
              {applyHere && (
                <Link href={applyHere} className="mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110" style={{ backgroundColor: colour }}>
                  Apply to join
                </Link>
              )}
            </section>
          )}
          {(clan.description || clan.requirements) && (
            <div className="grid gap-4 md:grid-cols-2 md:items-start">
              {clan.description && (
                <section className={`rounded-2xl border border-surface-border bg-surface p-6 ${clan.requirements ? "" : "md:col-span-2"}`}>
                  <h2 className="text-lg font-semibold">About</h2>
                  <p className="mt-3 break-words whitespace-pre-wrap text-muted">{clan.description}</p>
                </section>
              )}
              {clan.requirements && (
                <section className={`rounded-2xl border border-surface-border bg-surface p-6 ${clan.description ? "" : "md:col-span-2"}`}>
                  <h2 className="text-lg font-semibold">What they ask of you</h2>
                  <p className="mt-3 break-words whitespace-pre-wrap text-muted">{clan.requirements}</p>
                </section>
              )}
            </div>
          )}
          {clan.alliances && (
            <section aria-label="Allies" className="space-y-4">
              <SectionHeader title="Allies" hint={clan.alliances.mode === "LIST" ? `Clans ${clan.name} is allied with.` : undefined} />
              {clan.alliances.mode === "NONE" ? (
                <p className="rounded-2xl border border-dashed border-surface-border p-6 text-sm text-muted">No allies.</p>
              ) : (
                <div className="space-y-4">
                  {clan.alliances.alliances.map((a) => (
                    <div key={a.id} className="rounded-2xl border border-surface-border bg-surface p-5">
                      <h3 className="font-semibold">
                        {a.hasPage ? (
                          <Link href={hubHref(site, `/alliances/${a.id}`)} className="hover:underline">
                            {a.name}
                          </Link>
                        ) : (
                          a.name
                        )}
                      </h3>
                      <ul className="mt-3 flex flex-wrap gap-3">
                        {a.clans.map((c) => (
                          <li key={c.slug}>
                            <Link href={hubHref(site, `/c/${c.slug}`)} className="flex items-center gap-2.5 rounded-xl border border-surface-border px-3 py-2 text-sm transition hover:border-white/20">
                              <ClanMark clan={c} size={28} />
                              <span className="break-words">{c.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          {eventsHubOn() && clan.clanVsClan && clan.clanVsClan.length > 0 && (
            <section aria-label="Clan vs clan" className="space-y-4">
              <SectionHeader title="Clan vs clan" hint={`Open clan-vs-clan events ${clan.name} took part in.`} />
              <ul className="divide-y divide-surface-border/60 rounded-2xl border border-surface-border bg-surface text-sm">
                {clan.clanVsClan.map((h) => (
                  <li key={h.eventId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <span className="min-w-0">
                      <span className="font-medium break-words">{h.name}</span>
                      <span className="block text-xs text-muted">
                        {GAME[h.game] ?? "Event"}
                        {h.hosted ? " · hosted" : h.host ? ` · hosted by ${h.host}` : ""}
                        {h.endedAt ? ` · ended ${new Date(h.endedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">{h.place ? `${ordinal(h.place)} of ${h.clans}` : `${h.clans} clans`}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-label="Upcoming events" className="space-y-4">
            <SectionHeader title="Coming up" hint={`Public events from ${clan.name}.`} />
            {events.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-surface-border p-6 text-sm text-muted">This clan has no public events scheduled.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {events.map((e) => (
                  <EventCard key={e.id} event={e} site={site} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="space-y-4 rounded-2xl border border-surface-border bg-surface p-6 text-sm">
            <h2 className="text-lg font-semibold">At a glance</h2>
            {clan.focus.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wider text-muted uppercase">Focus</p>
                <FocusChips focus={clan.focus} accent={colour} />
              </div>
            )}
            <dl className="divide-y divide-surface-border">
              {clan.timezone && (
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-muted">Timezone</dt>
                  <dd>{clan.timezone}</dd>
                </div>
              )}
              {clan.clanName && (
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-muted">In-game clan</dt>
                  <dd>{clan.clanName}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-muted">Recruiting</dt>
                <dd>{clan.recruiting.label}</dd>
              </div>
            </dl>
            {apply && (
              <a href={apply} {...(applyExternal ? { target: "_blank", rel: "noreferrer noopener" } : {})} className="block rounded-xl py-2.5 text-center font-semibold text-black transition hover:brightness-110" style={{ backgroundColor: colour }}>
                {applyHere ? "Apply to join" : "How to apply"}
              </a>
            )}
          </div>
          <ReportClan slug={clan.slug} />
        </aside>
      </div>
    </div>
  );
}
