import Link from "next/link";
import { BarChart, DonutChart, RankedBars } from "@/components/charts";
import { PageHeader, Panel, StatTile, Unavailable } from "@/components/site/blocks";
import { Tabbed } from "@/components/site/Tabbed";
import { RsChathead } from "@/components/site/RsChathead";
import { SkillIcon } from "@/components/site/SkillIcon";
import { compact, full, getOverview, shortDay } from "@/lib/site";

export const metadata = { title: "Clan stats — Younglings" };
// Rendered per request: the data comes from the bot over a private network that doesn't exist at build time,
// so prerendering would bake in an empty "unavailable" page. The fetches themselves are still cached briefly.
export const dynamic = "force-dynamic";

const PERIODS = [
  { id: "day", label: "24 hours" },
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
] as const;

export default async function StatsPage() {
  const o = await getOverview();

  if (o === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <PageHeader title="Clan stats" />
        <Unavailable what="Clan statistics" />
      </div>
    );
  }

  const thisWeek = o.citadel.weeks.at(-1);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Clan stats" subtitle="Live from the clan's bot: polled XP, Citadel activity, joins and leaves. Weeks run Wednesday to Tuesday, the way the Citadel resets." />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Members" value={o.clan.memberCount} sub={`${o.clan.verifiedCount} verified`} />
        <StatTile label="Combined XP" value={compact(o.clan.totalXp)} sub={full(o.clan.totalXp)} />
        <StatTile label="Average total level" value={full(o.clan.averageTotalLevel)} />
        <StatTile label="Caps this week" value={thisWeek?.capped ?? 0} sub={`${thisWeek?.visited ?? 0} visited`} />
      </section>

      <Panel title="XP gained by the clan">
        <div className="mb-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xl font-semibold">{compact(o.clan.xpToday)}</p>
            <p className="text-xs text-muted">24 hours</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{compact(o.clan.xpWeek)}</p>
            <p className="text-xs text-muted">7 days</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{compact(o.clan.xpMonth)}</p>
            <p className="text-xs text-muted">30 days</p>
          </div>
        </div>
        <Tabbed
          initial="week"
          tabs={PERIODS.map((p) => ({
            id: p.id,
            label: p.label,
            content: <RankedBars rows={o.gains[p.id].map((g) => ({ label: g.rsn, value: g.xp }))} linkBase="/members/" />,
          }))}
        />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Citadel — caps and visits per week">
          <BarChart
            groups={o.citadel.weeks.map((w) => ({ label: shortDay(w.weekStart), values: [w.capped, w.visited] }))}
            series={[
              { name: "Capped", color: "#d4af37" },
              { name: "Visited", color: "#5aa9e6" },
            ]}
          />
        </Panel>
        <Panel title="Most Citadel caps">
          <RankedBars rows={o.citadel.topCappers.map((c) => ({ label: c.rsn, value: c.weeksCapped }))} format={(n) => `${n} week${n === 1 ? "" : "s"}`} linkBase="/members/" />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Joins and leaves per week">
          {o.roster.length > 0 ? (
            <BarChart
              groups={o.roster.map((w) => ({ label: shortDay(w.weekStart), values: [w.joins, w.leaves] }))}
              series={[
                { name: "Joined", color: "#3ecf8e" },
                { name: "Left", color: "#e0627a" },
              ]}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted">No roster changes recorded yet.</p>
          )}
        </Panel>
        <Panel title="Rank breakdown">
          <DonutChart
            slices={[...o.ranks].sort((a, b) => b.order - a.order).map((r) => ({ label: r.name, value: r.count }))}
            center={
              <>
                <span className="text-3xl font-bold">{o.clan.memberCount}</span>
                <span className="text-xs text-muted">members</span>
              </>
            }
          />
        </Panel>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Highest total XP">
          <RankedBars rows={o.topXp.map((r) => ({ label: r.rsn, value: r.value }))} linkBase="/members/" />
        </Panel>
        <Panel title="Most clan points">
          <RankedBars rows={o.topPoints.map((r) => ({ label: r.rsn, value: r.value }))} color="#3ecf8e" format={full} linkBase="/members/" />
        </Panel>
        {o.topKills.length > 0 && (
          <Panel title="Most boss kills">
            <RankedBars rows={o.topKills.map((r) => ({ label: r.rsn, value: r.value }))} color="#e0627a" format={full} linkBase="/members/" />
          </Panel>
        )}
      </div>

      <Panel title="Skill leaders" action={<span className="text-xs text-muted">Top 3 by XP in each skill</span>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {o.skillLeaders.map((skill) => (
            <div key={skill.skillId} className="rounded-lg border border-surface-border/60 bg-background/40 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold">
                <SkillIcon name={skill.skill} size={24} />
                {skill.skill}
              </p>
              <ol className="space-y-1 text-sm">
                {skill.leaders.map((leader, i) => (
                  <li key={leader.rsn} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-4 text-xs text-muted">{i + 1}</span>
                      <RsChathead rsn={leader.rsn} size={20} />
                      <Link href={`/members/${encodeURIComponent(leader.rsn)}`} className="truncate hover:text-gold">
                        {leader.rsn}
                      </Link>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {leader.level} · {compact(leader.xp)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Panel>

      <p className="text-center text-xs text-muted">
        Numbers come from the bot&apos;s regular RuneMetrics polling, so they trail the game by a few hours.
      </p>
    </div>
  );
}
