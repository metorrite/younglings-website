import Link from "next/link";
import { RankedBars } from "@/components/charts";
import { Panel, StatTile } from "@/components/site/blocks";
import { buildSlides, recapHeadline, recapPath } from "@/lib/recap";
import { RECAP_PERIODS, compact, full, shortDay, type Recap } from "@/lib/site";
import { RecapStory } from "./RecapStory";

/**
 * A whole recap page: the animated story, then every number in plain, accessible form (the "final static page"),
 * then links to other periods and to the matching clan or member view. Shared by the clan and member routes.
 */
export function RecapPage({ recap }: { recap: Recap }) {
  const clan = recap.scope === "clan";
  const rsn = clan ? undefined : recap.subject.name;
  const path = recapPath(recap.scope, recap.period.token, rsn);
  const slides = buildSlides(recap);
  const act = recap.activity.hidden ? null : recap.activity;
  const caps = clan ? recap.citadel.capWeeks ?? 0 : recap.citadel.weeksCapped ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
      <nav className="flex flex-wrap items-center justify-center gap-2 text-sm" aria-label="Recap period">
        {RECAP_PERIODS.map((p) => (
          <Link
            key={p.token}
            href={recapPath(recap.scope, p.token, rsn)}
            className={`rounded-full border px-3 py-1 ${recap.period.token === p.token ? "border-gold bg-gold/15 text-gold" : "border-surface-border text-muted hover:text-foreground"}`}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      <RecapStory slides={slides} imageSrc={`${path}/image`} headline={recapHeadline(recap)} detailsHref="#numbers" />

      <section id="numbers" className="scroll-mt-6 space-y-6">
        <header className="text-center">
          <p className="text-xs tracking-[0.3em] text-muted uppercase">{recap.period.label}</p>
          <h1 className="text-3xl font-bold text-gold">{recap.subject.name}</h1>
          <p className="mt-1 text-sm text-muted">{recapHeadline(recap)}</p>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="XP gained" value={compact(recap.xp.total)} sub={full(recap.xp.total)} />
          <StatTile label="Per day" value={compact(recap.xp.perDay)} sub={`${recap.xp.activeDays} active day${recap.xp.activeDays === 1 ? "" : "s"}`} />
          <StatTile label="Best day" value={recap.xp.bestDay ? compact(recap.xp.bestDay.xp) : "—"} sub={recap.xp.bestDay ? shortDay(recap.xp.bestDay.date) : undefined} />
          <StatTile label="Busiest weekday" value={recap.xp.busiestWeekday ?? "—"} />
          {!clan && recap.ranking?.inRankings && recap.ranking.rank && (
            <StatTile label="Clan rank" value={`#${recap.ranking.rank}`} sub={`of ${recap.ranking.outOf} · ${recap.ranking.shareOfClan}% of the clan's XP`} />
          )}
          {!clan && recap.levels && recap.levels.gained !== null && <StatTile label="Levels gained" value={String(recap.levels.gained)} sub={`${recap.levels.start} → ${recap.levels.end}`} />}
          {clan && <StatTile label="Active members" value={String(recap.activeMembers ?? 0)} sub={`of ${recap.subject.memberCount ?? "—"}`} />}
          <StatTile label="Clan points" value={full(recap.points)} />
          <StatTile label="Citadel weeks capped" value={String(caps)} sub={clan ? undefined : `${recap.citadel.longestStreak ?? 0}-week best streak`} />
          {act && <StatTile label="Boss kills" value={full(act.bossKills)} />}
          {act && <StatTile label="Level-ups" value={full(act.levelUps)} />}
          {act && <StatTile label="Quests" value={full(act.quests)} />}
          {act && <StatTile label="Notable drops" value={full(act.drops)} />}
        </div>

        {recap.activity.hidden && <p className="text-center text-sm text-muted">This member keeps their adventure log private, so boss kills, drops and milestones aren&apos;t shown.</p>}

        <div className="grid gap-6 lg:grid-cols-2">
          {recap.skills.length > 0 && (
            <Panel title="Top skills by XP">
              <RankedBars rows={recap.skills.map((s) => ({ label: s.skill, value: s.xp }))} color="#e0a24a" />
            </Panel>
          )}
          {clan && recap.topGainers && recap.topGainers.length > 0 && (
            <Panel title="Top XP gainers">
              <RankedBars rows={recap.topGainers.map((g) => ({ label: g.rsn, value: g.xp }))} linkBase="/members/" />
            </Panel>
          )}
          {act && act.topBosses.length > 0 && (
            <Panel title="Most-killed bosses">
              <RankedBars rows={act.topBosses.map((b) => ({ label: b.boss, value: b.kills }))} color="#e0627a" format={full} />
            </Panel>
          )}
          {clan && recap.topKillers && recap.topKillers.length > 0 && (
            <Panel title="Top boss hunters">
              <RankedBars rows={recap.topKillers.map((k) => ({ label: k.rsn, value: k.kills }))} color="#e0627a" format={full} linkBase="/members/" />
            </Panel>
          )}
          {clan && recap.citadel.topCappers && recap.citadel.topCappers.length > 0 && (
            <Panel title="Most Citadel caps">
              <RankedBars rows={recap.citadel.topCappers.map((c) => ({ label: c.rsn, value: c.weeksCapped }))} color="#4cc9c0" format={(n) => `${n} wk`} linkBase="/members/" />
            </Panel>
          )}
          {act && act.topDrops.length > 0 && (
            <Panel title="Notable drops">
              <RankedBars rows={act.topDrops.map((d) => ({ label: d.item, value: d.count }))} color="#d4af37" format={(n) => `×${n}`} />
            </Panel>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <Link href={clan ? "/recap" : `/recap/clan/${recap.period.token}`} className="rounded-md border border-surface-border px-4 py-2 hover:border-gold/50">
            {clan ? "Pick a member →" : "See the clan's recap →"}
          </Link>
          {!clan && (
            <Link href={`/members/${encodeURIComponent(recap.subject.name)}`} className="rounded-md border border-surface-border px-4 py-2 hover:border-gold/50">
              Open the full profile →
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
