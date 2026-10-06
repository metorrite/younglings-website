import Image from "next/image";
import Link from "next/link";
import { BarChart, RankedBars } from "@/components/charts";
import { FeedList } from "@/components/site/FeedList";
import { NewsBlock } from "@/components/site/NewsBlock";
import { OnlineRail } from "@/components/site/OnlineRail";
import { Panel, StatTile, Unavailable } from "@/components/site/blocks";
import { Tabbed } from "@/components/site/Tabbed";
import { compact, getFeed, getOverview, shortDay } from "@/lib/site";

// Rendered per request: the data comes from the bot over a private network that doesn't exist at build time,
// so prerendering would bake in an empty "unavailable" page. The fetches themselves are still cached briefly.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [overview, feed, milestoneFeed] = await Promise.all([getOverview(), getFeed(10), getFeed(60, "XP_MILESTONE")]);
  // Big XP milestones only — 100 million and up.
  const milestones = (milestoneFeed ?? []).filter((m) => Number(m.text.match(/^(\d+)XP/)?.[1] ?? 0) >= 100_000_000).slice(0, 5);
  const clan = overview?.clan;
  const thisWeek = overview?.citadel.weeks.at(-1);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.14),transparent_65%)]" />

      <div className="relative mx-auto max-w-[96rem] px-4 py-10 sm:px-6">
        <section className="flex flex-col items-center gap-4 text-center">
          <Image src="/clan-logo.png" alt="Younglings" width={88} height={88} className="rounded-full ring-2 ring-gold/50 shadow-[0_0_40px_rgba(212,175,55,0.25)]" />
          <div>
            <p className="text-xs tracking-[0.3em] text-muted uppercase">Welcome to</p>
            <h1 className="text-4xl font-bold tracking-wide text-gold sm:text-5xl">{clan?.name ?? "Younglings"}</h1>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <Link href="/members" className="rounded-md bg-gold px-4 py-2 font-semibold text-background transition hover:brightness-110">
              Browse members
            </Link>
            <Link href="/stats" className="rounded-md border border-surface-border px-4 py-2 transition hover:border-gold/50">
              Clan stats
            </Link>
            <Link href="/events" className="rounded-md border border-surface-border px-4 py-2 transition hover:border-gold/50">
              Events
            </Link>
          </div>
        </section>

        {/* Three columns: stats and leaderboards on the left, Discord news in the middle, who's online on the right. */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)_19rem] xl:grid-cols-[21rem_minmax(0,1fr)_21rem]">
          <div className="order-2 min-w-0 space-y-6 lg:order-none">
            {overview ? (
              <>
                <Panel title="Top XP gainers">
                  <Tabbed
                    initial="week"
                    tabs={(["day", "week", "month"] as const).map((period) => ({
                      id: period,
                      label: period === "day" ? "24h" : period === "week" ? "7d" : "30d",
                      content: <RankedBars rows={overview.gains[period].slice(0, 8).map((g) => ({ label: g.rsn, value: g.xp }))} linkBase="/members/" />,
                    }))}
                  />
                </Panel>

                {feed && feed.length > 0 && (
                  <Panel
                    title="Clan activity"
                    action={
                      <Link href="/activity" className="text-xs text-muted hover:text-gold">
                        See all →
                      </Link>
                    }
                  >
                    <FeedList items={feed} compact />
                  </Panel>
                )}

                {milestones.length > 0 && (
                  <Panel title="Milestones" action={<Link href="/hall-of-fame" className="text-xs text-muted hover:text-gold">Hall of Fame →</Link>}>
                    <FeedList items={milestones} compact />
                  </Panel>
                )}

                <Panel
                  title="Citadel"
                  action={
                    <Link href="/citadel" className="text-xs text-muted hover:text-gold">
                      Attendance →
                    </Link>
                  }
                >
                  <BarChart
                    groups={overview.citadel.weeks.slice(-6).map((w) => ({ label: shortDay(w.weekStart), values: [w.capped, w.visited] }))}
                    series={[
                      { name: "Capped", color: "#d4af37" },
                      { name: "Visited", color: "#5aa9e6" },
                    ]}
                    height={170}
                  />
                </Panel>
              </>
            ) : (
              <Unavailable what="Clan statistics" />
            )}
          </div>

          <div className="order-1 min-w-0 space-y-6 lg:order-none">
            {clan && (
              <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile label="Members" value={clan.memberCount} sub={`${clan.verifiedCount} verified on Discord`} href="/members" />
                <StatTile label="XP today" value={compact(clan.xpToday)} sub="clan-wide, last 24h" href="/stats" />
                <StatTile label="XP this week" value={compact(clan.xpWeek)} sub={`${compact(clan.xpMonth)} this month`} href="/leaderboards" />
                <StatTile label="Citadel caps" value={thisWeek?.capped ?? 0} sub={`${thisWeek?.visited ?? 0} visited this week`} href="/citadel" />
              </section>
            )}
            <NewsBlock />
          </div>

          <div className="order-3 min-w-0 lg:order-none">
            <OnlineRail />
          </div>
        </div>
      </div>
    </div>
  );
}
