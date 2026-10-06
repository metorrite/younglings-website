import Link from "next/link";
import { LineChart } from "@/components/charts";
import { PageHeader, Panel, ProgressBar, Unavailable } from "@/components/site/blocks";
import { full, getHistory, rankColor, shortDate, shortDay } from "@/lib/site";

export const metadata = { title: "Clan history — Younglings" };
export const dynamic = "force-dynamic";

const EVENT = {
  JOIN: { icon: "➕", color: "text-emerald-300", verb: "joined the clan" },
  LEAVE: { icon: "➖", color: "text-red-300", verb: "left the clan" },
  RENAME: { icon: "✏️", color: "text-sky-300", verb: "changed their name" },
} as const;

export default async function HistoryPage() {
  const history = await getHistory();
  const maxOrder = history ? Math.max(0, ...history.ranks.map((r) => r.order)) : 11;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Clan history" subtitle="How the clan has grown, who's come and gone, and who is closest to their next rank." />

      {history === null ? (
        <Unavailable what="The clan history" />
      ) : (
        <>
          <Panel title="Members over time">
            <LineChart points={history.memberCount.map((p) => ({ label: shortDay(p.date), value: p.members }))} format="integer" color="#3ecf8e" />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Recent joins, leaves and renames">
              {history.timeline.length === 0 ? (
                <p className="text-sm text-muted">No roster changes recorded yet.</p>
              ) : (
                <ol className="max-h-[28rem] space-y-3 overflow-y-auto pr-2">
                  {history.timeline.map((e, i) => {
                    const meta = EVENT[e.type];
                    return (
                      <li key={`${e.rsn}-${e.at}-${i}`} className="flex items-start gap-3 text-sm">
                        <span>{meta.icon}</span>
                        <span className="min-w-0">
                          {e.type !== "LEAVE" ? (
                            <Link href={`/members/${encodeURIComponent(e.rsn)}`} className="font-semibold hover:text-gold">
                              {e.rsn}
                            </Link>
                          ) : (
                            <span className="font-semibold">{e.rsn}</span>
                          )}{" "}
                          <span className={meta.color}>{e.type === "RENAME" && e.from ? `(was ${e.from}) ${meta.verb}` : meta.verb}</span>
                          <span className="block text-xs text-muted">{shortDate(e.at)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Panel>

            <Panel title="Rank ladder">
              <ol className="space-y-2">
                {[...history.ranks].sort((a, b) => b.order - a.order).map((r) => (
                  <li key={r.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rankColor(r.order, maxOrder) }} />
                      {r.name}
                    </span>
                    <span className="text-xs text-muted">
                      {r.threshold > 0 ? `${full(r.threshold)} pts · ` : ""}
                      {r.count} member{r.count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          {history.closeToPromotion.length > 0 && (
            <Panel title="Closest to their next rank">
              <ul className="grid gap-3 sm:grid-cols-2">
                {history.closeToPromotion.map((c) => (
                  <li key={c.rsn} className="rounded-lg border border-surface-border/60 bg-background/40 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`/members/${encodeURIComponent(c.rsn)}`} className="font-medium hover:text-gold">
                        {c.rsn}
                      </Link>
                      <span className="text-xs text-muted">
                        {c.rank} → {c.next}
                      </span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={c.points} max={c.points + c.needed} />
                    </div>
                    <p className="mt-1 text-xs text-muted">{c.needed === 0 ? "Eligible now" : `${full(c.needed)} points to go`}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
