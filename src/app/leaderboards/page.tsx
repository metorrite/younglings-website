import Link from "next/link";
import { RankedBars } from "@/components/charts";
import { PageHeader, Panel, StatTile, Unavailable } from "@/components/site/blocks";
import { compact, getLeaderboard, monthLabel } from "@/lib/site";

export const metadata = { title: "Leaderboards — Younglings" };
// Rendered per request (the bot's data isn't reachable at build time); the fetches are cached for a few minutes.
export const dynamic = "force-dynamic";

export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const query = await searchParams;
  const requested = typeof query.month === "string" && /^\d{4}-\d{2}$/.test(query.month) ? query.month : undefined;
  const board = await getLeaderboard(requested);

  if (board === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <PageHeader title="Leaderboards" />
        {requested ? (
          <div className="rounded-xl border border-dashed border-surface-border p-8 text-center text-sm text-muted">
            There&apos;s no data for that month. <Link href="/leaderboards" className="text-gold hover:underline">See the current month</Link>.
          </div>
        ) : (
          <Unavailable what="The leaderboards" />
        )}
      </div>
    );
  }

  const index = board.months.indexOf(board.month);
  const previous = index > 0 ? board.months[index - 1] : null;
  const next = index >= 0 && index < board.months.length - 1 ? board.months[index + 1] : null;
  const isCurrent = index === board.months.length - 1;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Leaderboards" subtitle="Month by month: who gained the most XP, who capped the Citadel, and who joined or left. Pick any month with data." />

      <div className="flex flex-wrap items-center gap-2">
        {previous ? (
          <Link href={`/leaderboards?month=${previous}`} className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold/50">
            ← {monthLabel(previous)}
          </Link>
        ) : (
          <span className="rounded-md border border-surface-border/50 px-3 py-1.5 text-sm text-muted/50">← Earliest data</span>
        )}
        <h2 className="px-3 text-xl font-semibold text-gold">
          {monthLabel(board.month)}
          {isCurrent && <span className="ml-2 text-xs font-normal text-muted">(so far)</span>}
        </h2>
        {next ? (
          <Link href={isCurrent ? "/leaderboards" : `/leaderboards?month=${next}`} className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold/50">
            {monthLabel(next)} →
          </Link>
        ) : (
          <span className="rounded-md border border-surface-border/50 px-3 py-1.5 text-sm text-muted/50">Latest →</span>
        )}
      </div>

      {board.months.length > 1 && (
        <nav className="flex flex-wrap gap-1.5 text-xs" aria-label="Months">
          {[...board.months].reverse().map((m) => (
            <Link
              key={m}
              href={m === board.months.at(-1) ? "/leaderboards" : `/leaderboards?month=${m}`}
              className={`rounded-full border px-2.5 py-1 ${m === board.month ? "border-gold bg-gold/15 text-gold" : "border-surface-border text-muted hover:text-foreground"}`}
            >
              {monthLabel(m)}
            </Link>
          ))}
        </nav>
      )}

      <section className="grid grid-cols-3 gap-3">
        <StatTile label="Clan XP gained" value={compact(board.totalXp)} />
        <StatTile label="Joined" value={board.joined.length} />
        <StatTile label="Left" value={board.left.length} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top XP gainers">
          <RankedBars rows={board.gainers.map((g) => ({ label: g.rsn, value: g.xp }))} linkBase="/members/" />
        </Panel>
        <Panel title="Most Citadel caps">
          <RankedBars rows={board.cappers.map((c) => ({ label: c.rsn, value: c.weeksCapped }))} color="#5aa9e6" format={(n) => `${n} week${n === 1 ? "" : "s"}`} linkBase="/members/" />
        </Panel>
      </div>

      {(board.joined.length > 0 || board.left.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          <Panel title={`Joined (${board.joined.length})`}>
            <ul className="flex flex-wrap gap-2 text-sm">
              {board.joined.map((rsn) => (
                <li key={rsn}>
                  <Link href={`/members/${encodeURIComponent(rsn)}`} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300 hover:bg-emerald-500/20">
                    {rsn}
                  </Link>
                </li>
              ))}
              {board.joined.length === 0 && <li className="text-muted">Nobody.</li>}
            </ul>
          </Panel>
          <Panel title={`Left (${board.left.length})`}>
            <ul className="flex flex-wrap gap-2 text-sm">
              {board.left.map((rsn) => (
                <li key={rsn} className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-red-300">
                  {rsn}
                </li>
              ))}
              {board.left.length === 0 && <li className="text-muted">Nobody.</li>}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}
