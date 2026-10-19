import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gateHub } from "@/components/clanshub/gate";
import { ClanMark, compact, EventCard, FocusChips, RecruitingBadge, SectionHeader, Stat, Unavailable, VerifiedTick } from "@/components/clanshub/parts";
import { ReportClan } from "@/components/clanshub/ReportClan";
import { clanAccent, clanEvents, getClan, leaderboard, withAlpha } from "@/lib/clansHub";
import { canSeeHub } from "@/lib/hubAccess";
import { hubHref } from "@/lib/siteHosts";
import { currentSite } from "@/lib/siteHostsServer";

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
  const apply = safeUrl(clan.applyUrl);
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
            <a href={apply} target="_blank" rel="noreferrer noopener" className="shrink-0 rounded-xl px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110" style={{ backgroundColor: colour }}>
              How to apply
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
              <a href={apply} target="_blank" rel="noreferrer noopener" className="block rounded-xl py-2.5 text-center font-semibold text-black transition hover:brightness-110" style={{ backgroundColor: colour }}>
                How to apply
              </a>
            )}
          </div>
          <ReportClan slug={clan.slug} />
        </aside>
      </div>
    </div>
  );
}
