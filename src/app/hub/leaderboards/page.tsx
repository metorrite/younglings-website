import type { Metadata } from "next";
import Link from "next/link";
import { gateHub } from "@/components/clanshub/gate";
import { ClanMark, compact, Unavailable } from "@/components/clanshub/parts";
import { clanAccent, leaderboard, withAlpha, type LeaderboardEntry } from "@/lib/clansHub";
import { hubHref } from "@/lib/siteHosts";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata: Metadata = { title: "Leaderboards", description: "Clans ranked by the XP their members gained." };
export const dynamic = "force-dynamic";

const MEDAL = ["#f5c542", "#c0c7d1", "#cd7f32"];

export default async function HubLeaderboards({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const closed = await gateHub();
  if (closed) return closed;
  const params = await searchParams;
  const period = params.period === "month" ? "month" : "week";
  const site = await currentSite();
  const entries = await leaderboard(period);

  const tab = (value: "week" | "month", label: string) => (
    <Link
      href={`${hubHref(site, "/leaderboards")}?period=${value}`}
      aria-current={period === value ? "page" : undefined}
      className={`rounded-lg px-5 py-2 text-sm font-medium transition ${period === value ? "bg-gold text-black" : "text-muted hover:text-foreground"}`}
    >
      {label}
    </Link>
  );

  const podium = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];
  const top = entries?.[0]?.xpGained ?? 1;
  const row = (e: LeaderboardEntry) => {
    const colour = clanAccent(e);
    return (
      <li key={e.slug}>
        <Link href={hubHref(site, `/c/${e.slug}`)} className="group relative grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-xl border border-surface-border bg-surface px-4 py-3 transition hover:border-white/20 md:grid-cols-[2.5rem_minmax(0,1fr)_8rem_6rem_7rem]">
          <span aria-hidden className="absolute inset-y-0 left-0" style={{ width: `${Math.max(4, (e.xpGained / top) * 100)}%`, backgroundColor: withAlpha(colour, 0.1) }} />
          <span className="relative text-center font-semibold text-muted tabular-nums">{e.rank}</span>
          <span className="relative flex min-w-0 items-center gap-3">
            <ClanMark clan={e} size={36} />
            <span className="truncate font-medium">{e.name}</span>
          </span>
          <span className="relative text-right font-semibold tabular-nums">{compact(e.xpGained)} XP</span>
          <span className="relative hidden text-right text-sm text-muted tabular-nums md:block">{e.members} members</span>
          <span className="relative hidden text-right text-sm text-muted tabular-nums md:block">{compact(e.perMember)} each</span>
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">Leaderboards</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Who gained the most</h1>
          <p className="mt-3 max-w-xl text-lg text-muted">Clans that opted in, ranked by the total XP their members gained. Only totals are shown, never an individual member&apos;s figure.</p>
        </div>
        <div className="inline-flex rounded-xl border border-surface-border bg-surface p-1">
          {tab("week", "This week")}
          {tab("month", "This month")}
        </div>
      </header>

      {entries === null ? (
        <Unavailable />
      ) : entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">No clan has joined the leaderboard yet. A clan opts in from its profile settings.</p>
      ) : (
        <>
          {/* In rank order for screen readers and phones; on a wide screen the winner is moved to the middle (order classes below). */}
          <ol aria-label="Top three" className="mx-auto grid max-w-4xl items-end gap-4 sm:grid-cols-3">
            {podium.map((e) => {
              const colour = clanAccent(e);
              const place = e.rank - 1;
              return (
                <li key={e.slug} className={place === 0 ? "sm:order-2" : place === 1 ? "sm:order-1" : "sm:order-3"}>
                  <Link
                    href={hubHref(site, `/c/${e.slug}`)}
                    className={`flex flex-col items-center rounded-2xl border bg-surface p-6 text-center transition hover:-translate-y-0.5 ${place === 0 ? "sm:pb-12" : place === 1 ? "sm:pb-8" : "sm:pb-5"}`}
                    style={{ borderColor: withAlpha(MEDAL[place], 0.55), background: `linear-gradient(180deg, ${withAlpha(colour, 0.18)}, transparent 70%)` }}
                  >
                    <span className="text-sm font-bold tracking-widest uppercase" style={{ color: MEDAL[place] }}>
                      #{e.rank}
                    </span>
                    <span className="mt-3">
                      <ClanMark clan={e} size={place === 0 ? 84 : 68} />
                    </span>
                    <span className="mt-3 max-w-full truncate text-lg font-semibold">{e.name}</span>
                    <span className="mt-1 text-2xl font-semibold tabular-nums">{compact(e.xpGained)}</span>
                    <span className="text-xs text-muted">XP gained · {e.members} members</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          {rest.length > 0 && <ol className="space-y-2">{rest.map(row)}</ol>}
        </>
      )}
    </div>
  );
}
