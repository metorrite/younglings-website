import type { Metadata } from "next";
import Link from "next/link";
import { gateHub } from "@/components/clanshub/gate";
import { ClanMark, Unavailable } from "@/components/clanshub/parts";
import { leaderboard } from "@/lib/clansHub";
import { hubHref } from "@/lib/siteHosts";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata: Metadata = { title: "Leaderboards", description: "Clans ranked by the XP their members gained." };
export const dynamic = "force-dynamic";

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
      className={`rounded-lg px-4 py-1.5 text-sm transition ${period === value ? "bg-gold/20 text-gold" : "text-muted hover:text-foreground"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Leaderboards</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Clans that opted in, ranked by the total XP their members gained. Only totals are shown: never an individual member&apos;s own figure.
        </p>
      </div>
      <div className="inline-flex rounded-xl border border-surface-border p-1">
        {tab("week", "This week")}
        {tab("month", "This month")}
      </div>
      {entries === null ? (
        <Unavailable />
      ) : entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-surface-border p-8 text-center text-sm text-muted">No clan has joined the leaderboard yet. A clan opts in from its profile settings.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Clan</th>
                <th className="px-4 py-3 text-right font-medium">XP gained</th>
                <th className="px-4 py-3 text-right font-medium">Members</th>
                <th className="px-4 py-3 text-right font-medium">Per member</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.slug} className="border-t border-surface-border">
                  <td className="px-4 py-3 tabular-nums text-muted">{e.rank}</td>
                  <td className="px-4 py-3">
                    <Link href={hubHref(site, `/c/${e.slug}`)} className="flex items-center gap-3 hover:text-gold">
                      <ClanMark clan={e} size={32} />
                      <span className="font-medium">{e.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{e.xpGained.toLocaleString("en-GB")}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{e.members}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{e.perMember.toLocaleString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
