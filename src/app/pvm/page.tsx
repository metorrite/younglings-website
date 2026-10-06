import Link from "next/link";
import { RankedBars } from "@/components/charts";
import { PageHeader, Panel, StatTile, Unavailable } from "@/components/site/blocks";
import { Tabbed } from "@/components/site/Tabbed";
import { full, getDrops, getPvm } from "@/lib/site";

export const metadata = { title: "PvM & drops — Younglings" };
export const dynamic = "force-dynamic";

export default async function PvmPage() {
  const [pvm, drops] = await Promise.all([getPvm(), getDrops()]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="PvM & drops" subtitle="Boss kills and notable drops recorded in members' adventure logs. Counts cover what the bot has seen since it began tracking." />

      {pvm === null || drops === null ? (
        <Unavailable what="PvM stats" />
      ) : (
        <>
          <section className="grid grid-cols-3 gap-3">
            <StatTile label="Boss kills logged" value={full(pvm.totalKills)} />
            <StatTile label="Different bosses" value={pvm.bosses.length} />
            <StatTile label="Notable drops" value={full(drops.total)} />
          </section>

          <Tabbed
            tabs={[
              {
                id: "bosses",
                label: "Bosses",
                content: (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Panel title="Most-killed bosses">
                      <RankedBars rows={pvm.bosses.slice(0, 12).map((b) => ({ label: b.boss, value: b.total }))} color="#e0627a" format={full} />
                    </Panel>
                    <Panel title="Top killers">
                      <RankedBars rows={pvm.topKillers.map((k) => ({ label: k.rsn, value: k.kills }))} color="#e0627a" format={full} linkBase="/members/" />
                    </Panel>
                    <Panel title="Boss by boss" className="lg:col-span-2">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {pvm.bosses.map((b) => (
                          <div key={b.boss} className="rounded-lg border border-surface-border/60 bg-background/40 p-3">
                            <p className="flex items-baseline justify-between gap-2 text-sm font-semibold text-gold">
                              {b.boss}
                              <span className="text-xs font-normal text-muted">{full(b.total)} kills</span>
                            </p>
                            <ol className="mt-2 space-y-1 text-sm">
                              {b.killers.map((k, i) => (
                                <li key={k.rsn} className="flex items-center justify-between gap-2">
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span className="w-4 text-xs text-muted">{i + 1}</span>
                                    <Link href={`/members/${encodeURIComponent(k.rsn)}`} className="truncate hover:text-gold">
                                      {k.rsn}
                                    </Link>
                                  </span>
                                  <span className="shrink-0 text-xs text-muted">{full(k.kills)}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </div>
                ),
              },
              {
                id: "drops",
                label: "Drop log",
                content: (
                  <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <Panel title="Recent drops">
                      {drops.recent.length === 0 ? (
                        <p className="text-sm text-muted">No notable drops recorded yet.</p>
                      ) : (
                        <ul className="divide-y divide-surface-border/60">
                          {drops.recent.map((d, i) => (
                            <li key={`${d.rsn}-${d.recordedAt}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                              <span className="min-w-0">
                                <Link href={`/members/${encodeURIComponent(d.rsn)}`} className="font-semibold hover:text-gold">
                                  {d.rsn}
                                </Link>{" "}
                                found <span className="text-gold">{d.item}</span>
                              </span>
                              <span className="shrink-0 text-xs text-muted">{d.date}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Panel>
                    <Panel title="Most common drops">
                      <RankedBars rows={drops.topItems.map((t) => ({ label: t.item, value: t.count }))} format={(n) => `×${n}`} />
                    </Panel>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
