import Image from "next/image";
import Link from "next/link";
import { BarChart, RankedBars } from "@/components/charts";
import { OnlineRail } from "@/components/site/OnlineRail";
import { Panel, StatTile, Unavailable } from "@/components/site/blocks";
import { Tabbed } from "@/components/site/Tabbed";
import { compact, getOverview, shortDay } from "@/lib/site";

// Live clan numbers: re-fetched from the bot at most every 30 seconds rather than on every request.
// Rendered per request: the data comes from the bot over a private network that doesn't exist at build time,
// so prerendering would bake in an empty "unavailable" page. The fetches themselves are still cached briefly.
export const dynamic = "force-dynamic";

export default async function Home() {
  const overview = await getOverview();
  const clan = overview?.clan;
  const thisWeek = overview?.citadel.weeks.at(-1);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.14),transparent_65%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <section className="flex flex-col items-center gap-5 text-center">
          <Image src="/clan-logo.png" alt="Younglings" width={104} height={104} className="rounded-full ring-2 ring-gold/50 shadow-[0_0_40px_rgba(212,175,55,0.25)]" />
          <div>
            <p className="text-xs tracking-[0.3em] text-muted uppercase">Welcome to</p>
            <h1 className="text-4xl font-bold tracking-wide text-gold sm:text-5xl">{clan?.name ?? "Younglings"}</h1>
          </div>
          <p className="max-w-xl text-sm text-muted">
            A RuneScape clan on Discord. Browse the roster, follow weekly XP and Citadel caps, and dig into any member&apos;s profile — it all updates live from the clan&apos;s bot.
          </p>
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

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_20rem] xl:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-6">
            {clan ? (
              <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile label="Members" value={clan.memberCount} sub={`${clan.verifiedCount} verified on Discord`} href="/members" />
                <StatTile label="XP today" value={compact(clan.xpToday)} sub="clan-wide, last 24h" href="/stats" />
                <StatTile label="XP this week" value={compact(clan.xpWeek)} sub={`${compact(clan.xpMonth)} this month`} href="/stats" />
                <StatTile label="Citadel caps" value={thisWeek?.capped ?? 0} sub={`${thisWeek?.visited ?? 0} visited this week`} href="/stats" />
              </section>
            ) : (
              <Unavailable what="Clan statistics" />
            )}

            {overview && (
              <>
                <Panel title="Top XP gainers">
                  <Tabbed
                    initial="week"
                    tabs={(["day", "week", "month"] as const).map((period) => ({
                      id: period,
                      label: period === "day" ? "24 hours" : period === "week" ? "7 days" : "30 days",
                      content: <RankedBars rows={overview.gains[period].slice(0, 8).map((g) => ({ label: g.rsn, value: g.xp }))} linkBase="/members/" />,
                    }))}
                  />
                </Panel>

                <Panel
                  title="Citadel — caps and visits per week"
                  action={
                    <Link href="/stats" className="text-xs text-muted hover:text-gold">
                      All stats →
                    </Link>
                  }
                >
                  <BarChart
                    groups={overview.citadel.weeks.slice(-8).map((w) => ({ label: shortDay(w.weekStart), values: [w.capped, w.visited] }))}
                    series={[
                      { name: "Capped", color: "#d4af37" },
                      { name: "Visited", color: "#5aa9e6" },
                    ]}
                  />
                </Panel>
              </>
            )}
          </div>

          <OnlineRail />
        </div>
      </div>
    </div>
  );
}
