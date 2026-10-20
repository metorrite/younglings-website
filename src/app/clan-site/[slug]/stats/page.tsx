import type { Metadata } from "next";
import { SiteCard, SiteHeading } from "@/components/clansite/SiteShell";
import { fmt, fmtCompact, Unavailable } from "@/components/clansite/parts";
import { sitePage } from "@/lib/clanSitePage";
import { tenantData } from "@/lib/clanSites";

export const metadata: Metadata = { title: "Stats" };

/** Clan totals, and this week's top gainers (members who opted out of the rankings are never listed: the bot leaves them out). */
export default async function Stats({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { page } = await sitePage(slug, "stats");
  const data = await tenantData(slug, "overview");
  if (!data) {
    return (
      <>
        <SiteHeading title={page.title} />
        <Unavailable />
      </>
    );
  }
  const c = data.clan;
  const tiles: [string, string][] = [
    ["Members", fmt(c.memberCount)],
    ["Total XP", fmtCompact(c.totalXp)],
    ["XP this week", fmtCompact(c.xpWeek)],
    ["XP this month", fmtCompact(c.xpMonth)],
    ["Boss kills", fmt(c.totalKills)],
    ["Average total level", fmt(Math.round(c.averageTotalLevel))],
  ];
  const week = data.gains.week.slice(0, 10);
  return (
    <>
      <SiteHeading title={page.title} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {tiles.map(([label, value]) => (
          <SiteCard key={label}>
            <p className="text-xs uppercase tracking-wide text-[var(--cs-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </SiteCard>
        ))}
      </div>
      {week.length > 0 && (
        <SiteCard className="mt-6">
          <h2 className="mb-3 font-semibold">Top XP this week</h2>
          <ol className="space-y-1 text-sm">
            {week.map((g, i) => (
              <li key={g.rsn} className="flex justify-between gap-4">
                <span>
                  <span className="mr-2 text-[var(--cs-muted)]">{i + 1}.</span>
                  {g.rsn}
                </span>
                <span className="text-[var(--cs-muted)]">{fmtCompact(g.xp)}</span>
              </li>
            ))}
          </ol>
        </SiteCard>
      )}
    </>
  );
}
