import Link from "next/link";
import { RankedBars } from "@/components/charts";
import { PageHeader, Panel, Unavailable } from "@/components/site/blocks";
import { compact, full, getOverview, getRecords, shortDate } from "@/lib/site";

export const metadata = { title: "Hall of Fame — Younglings" };
export const dynamic = "force-dynamic";

const BADGES = [
  ["🔥", "Cap streak", "Capped the Citadel 3+ weeks in a row"],
  ["🏰", "Citadel regular", "Capped in 4 or more different weeks"],
  ["💎", "200M club", "One or more skills at 200M XP"],
  ["🎓", "All skills 99+", "Every skill at level 99 or higher"],
  ["🛡️", "Veteran", "6 months or a year in the clan"],
  ["🚀", "Rising star", "Top 3 for XP gained this week"],
  ["⭐", "Points leader", "Top 3 for clan points"],
  ["✅", "Verified", "RuneScape name linked to Discord"],
];

export default async function HallOfFamePage() {
  const [records, overview] = await Promise.all([getRecords(), getOverview()]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Hall of Fame" subtitle="The clan's records and the members who hold them. Records cover what the bot has tracked since it began polling." />

      {records === null ? (
        <Unavailable what="The Hall of Fame" />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Biggest single day of XP">
              <ol className="space-y-2">
                {records.biggestDays.map((d, i) => (
                  <li key={`${d.rsn}-${d.date}`} className="flex items-center justify-between gap-3 rounded-md border border-surface-border/60 bg-background/40 px-3 py-2 text-sm">
                    <span className="flex items-center gap-3">
                      <span className="w-5 text-xs text-muted">{i + 1}</span>
                      <Link href={`/members/${encodeURIComponent(d.rsn)}`} className="font-medium hover:text-gold">
                        {d.rsn}
                      </Link>
                      <span className="text-xs text-muted">{shortDate(d.date)}</span>
                    </span>
                    <span className="font-mono text-xs text-gold">+{compact(d.xp)}</span>
                  </li>
                ))}
                {records.biggestDays.length === 0 && <li className="text-sm text-muted">Not enough history yet.</li>}
              </ol>
            </Panel>

            <Panel title="Longest Citadel cap streaks">
              <RankedBars rows={records.capStreaks.map((s) => ({ label: s.rsn, value: s.longest }))} format={(n) => `${n} week${n === 1 ? "" : "s"}`} color="#e0a24a" linkBase="/members/" />
              {records.capStreaks.some((s) => s.current > 1) && (
                <p className="mt-3 text-xs text-muted">
                  Still going: {records.capStreaks.filter((s) => s.current > 1).map((s) => `${s.rsn} (${s.current})`).join(", ")}
                </p>
              )}
            </Panel>

            <Panel title="200M club" action={<span className="text-xs text-muted">Skills at 200M XP</span>}>
              <RankedBars rows={records.twoHundredClub.map((c) => ({ label: c.rsn, value: c.skills }))} format={(n) => `${n} skill${n === 1 ? "" : "s"}`} color="#5aa9e6" linkBase="/members/" />
            </Panel>

            <Panel title="Longest-serving members">
              <ol className="space-y-2">
                {records.veterans.map((v, i) => (
                  <li key={v.rsn} className="flex items-center justify-between gap-3 rounded-md border border-surface-border/60 bg-background/40 px-3 py-2 text-sm">
                    <span className="flex items-center gap-3">
                      <span className="w-5 text-xs text-muted">{i + 1}</span>
                      <Link href={`/members/${encodeURIComponent(v.rsn)}`} className="font-medium hover:text-gold">
                        {v.rsn}
                      </Link>
                    </span>
                    <span className="text-xs text-muted">{v.joinedExact ? "" : "since about "}{shortDate(v.joined)}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          {overview && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Most total XP">
                <RankedBars rows={overview.topXp.slice(0, 5).map((r) => ({ label: r.rsn, value: r.value }))} linkBase="/members/" />
              </Panel>
              <Panel title="Most clan points">
                <RankedBars rows={overview.topPoints.slice(0, 5).map((r) => ({ label: r.rsn, value: r.value }))} color="#3ecf8e" format={full} linkBase="/members/" />
              </Panel>
            </div>
          )}
        </>
      )}

      <Panel title="Badges you can earn" action={<span className="text-xs text-muted">Shown on profiles</span>}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {BADGES.map(([icon, label, how]) => (
            <li key={label} className="flex items-center gap-3 rounded-lg border border-surface-border/60 bg-background/40 px-3 py-2.5">
              <span className="text-2xl">{icon}</span>
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted">{how}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
