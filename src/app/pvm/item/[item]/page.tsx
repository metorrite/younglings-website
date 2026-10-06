import Image from "next/image";
import Link from "next/link";
import { BarChart } from "@/components/charts";
import { DropList, ItemIcon } from "@/components/pvm/DropViews";
import { Panel, StatTile, Unavailable } from "@/components/site/blocks";
import { TimeFrame } from "@/components/site/TimeFrame";
import { full, getItem, monthLabel, normalisePeriod } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ item: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ params }: Props) {
  const { item } = await params;
  const label = item.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return { title: `${label} — Younglings` };
}

export default async function ItemPage({ params, searchParams }: Props) {
  const [{ item: key }, query] = await Promise.all([params, searchParams]);
  const period = normalisePeriod(query.period) ?? "all";
  const boss = typeof query.boss === "string" && /^[a-z0-9_]+$/.test(query.boss) ? query.boss : null;
  const data = await getItem(key, period, boss);

  if (data === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Link href="/drops" className="text-sm text-muted hover:text-gold">← Drop log</Link>
        <div className="mt-6"><Unavailable what="This item" /></div>
      </div>
    );
  }

  const { item } = data;
  const first = data.receivers.length > 0 ? data.receivers.reduce((a, b) => (a.first < b.first ? a : b)) : null;
  const last = data.receivers.length > 0 ? data.receivers.reduce((a, b) => (a.last > b.last ? a : b)) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
      <Link href={`/drops${period !== "all" ? `?period=${period}` : ""}`} className="text-sm text-muted hover:text-gold">← Drop log</Link>

      <header className="flex items-center gap-5">
        <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border bg-surface ${data.total > 0 ? "border-gold/50" : "border-surface-border"}`}>
          <ItemIcon icon={item.icon} name={item.name} size={64} className={data.total > 0 ? "" : "opacity-30 grayscale"} />
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-wide text-gold">{item.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {item.rarity ? `Drop rate: ${item.rarity}` : "Drop rate unknown"}
            {item.quantity && ` · quantity ${item.quantity}`}
            {!item.tracked && " · the adventure log doesn't report this item yet, so it reads zero"}
          </p>
        </div>
      </header>

      <TimeFrame current={data.period.token} label={data.period.label} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Times received" value={full(data.total)} />
        <StatTile label="Members" value={data.receivers.length} />
        <StatTile label="First seen" value={first ? first.first.slice(0, 10) : "—"} />
        <StatTile label="Most recent" value={last ? last.last.slice(0, 10) : "—"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Dropped by">
          {data.bosses.length === 0 ? (
            <p className="text-sm text-muted">No boss on file drops this item.</p>
          ) : (
            <ul className="divide-y divide-surface-border/50">
              {data.bosses.map((b) => (
                <li key={b.key}>
                  <Link href={`/pvm/${b.key}${period !== "all" ? `?period=${period}` : ""}`} className="flex items-center gap-3 py-2 hover:text-gold">
                    {b.image ? <Image src={b.image} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-md bg-background/60 object-contain" /> : <span className="h-9 w-9 shrink-0 rounded-md bg-white/5" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{b.name}</span>
                    <span className="shrink-0 text-xs text-muted">{b.rarity}</span>
                    <span className={`w-8 shrink-0 text-right text-sm tabular-nums ${b.count > 0 ? "text-gold" : "text-muted"}`}>{b.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Who has received it">
          {data.receivers.length === 0 ? (
            <p className="text-sm text-muted">Nobody yet in this window.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wider text-muted uppercase">
                  <th className="pb-2 font-medium">Member</th>
                  <th className="pb-2 text-right font-medium">Times</th>
                  <th className="pb-2 text-right font-medium">Latest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {data.receivers.map((r) => (
                  <tr key={r.rsn}>
                    <td className="py-1.5"><Link href={`/members/${encodeURIComponent(r.rsn)}`} className="hover:text-gold">{r.rsn}</Link></td>
                    <td className="py-1.5 text-right tabular-nums text-gold">{r.count}</td>
                    <td className="py-1.5 text-right text-xs text-muted">{r.last.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      {data.byMonth.length > 1 && (
        <Panel title="Received by month">
          <BarChart groups={data.byMonth.map((m) => ({ label: monthLabel(m.month).slice(0, 3), values: [m.count] }))} series={[{ name: "Received", color: "#d4af37" }]} height={170} format="full" />
        </Panel>
      )}

      <Panel title="Every time it dropped">
        <DropList entries={data.list} empty="Not received in this window." />
      </Panel>
    </div>
  );
}
