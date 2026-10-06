import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart } from "@/components/charts";
import { DropGrid, DropList } from "@/components/pvm/DropViews";
import { Panel, StatTile, Unavailable } from "@/components/site/blocks";
import { TimeFrame } from "@/components/site/TimeFrame";
import { full, getBoss, normalisePeriod, shortDay } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ boss: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ params }: Props) {
  const { boss } = await params;
  const label = boss.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: `${label} — Younglings` };
}

export default async function BossPage({ params, searchParams }: Props) {
  const [{ boss: key }, query] = await Promise.all([params, searchParams]);
  const period = normalisePeriod(query.period) ?? "all";
  const data = await getBoss(key, period);
  if (data === null) {
    // Distinguish "the bot is down" from "no such boss" by asking for the overview, which always exists.
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Link href="/pvm" className="text-sm text-muted hover:text-gold">← All bosses</Link>
        <div className="mt-6"><Unavailable what="This boss" /></div>
      </div>
    );
  }
  if (!data.boss) notFound();

  const { boss } = data;
  const days = data.killsByDay.slice(-45);
  const withDrops = data.players.filter((p) => p.drops > 0).length;
  const top = data.players[0];

  return (
    <div className="pb-12">
      {/* Hero: the boss's artwork fades into the page behind, with a clear picture in front. */}
      <div className="relative overflow-hidden border-b border-surface-border">
        {boss.image && (
          <>
            <Image src={boss.image} alt="" fill priority sizes="100vw" className="object-cover object-top opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
          </>
        )}
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-8 pb-10 sm:flex-row sm:items-end sm:px-6">
          {boss.image && (
            <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl border border-gold/40 bg-background/60 shadow-[0_0_40px_rgba(212,175,55,0.15)] sm:h-56 sm:w-56">
              <Image src={boss.image} alt={boss.name} fill sizes="224px" className="object-contain p-2" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link href="/pvm" className="text-sm text-muted hover:text-gold">← All bosses</Link>
            <h1 className="mt-1 text-4xl font-bold tracking-wide text-gold">{boss.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {boss.catalogued ? "Full drop table from the RuneScape Wiki; the log reports only RuneScape's notable drops." : "Kills are tracked, but there's no drop table on file for this one."}
              {boss.wikiPage && (
                <>
                  {" "}
                  <a href={`https://runescape.wiki/w/${encodeURIComponent(boss.wikiPage.replace(/ /g, "_"))}`} target="_blank" rel="noreferrer" className="text-gold hover:underline">Wiki page ↗</a>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-6 sm:px-6">
        <TimeFrame current={data.period.token} label={data.period.label} />

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Kills" value={full(data.kills)} />
          <StatTile label="Members" value={data.players.filter((p) => p.kills > 0).length} />
          <StatTile label="Drops received" value={full(data.drops)} sub={withDrops > 0 ? `by ${withDrops} ${withDrops === 1 ? "member" : "members"}` : undefined} />
          <StatTile label="Most kills" value={top && top.kills > 0 ? top.rsn : "—"} sub={top && top.kills > 0 ? `${full(top.kills)} kills` : undefined} href={top && top.kills > 0 ? `/members/${encodeURIComponent(top.rsn)}` : undefined} />
        </section>

        <Panel title="Drop log" hint="Every item this boss can drop. Greyed out until the clan receives it; open an item for who got it and when.">
          <DropGrid cells={data.grid} period={period} boss={boss.key} />
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Drops received" className="lg:order-2">
            <DropList entries={data.list} showBoss={false} empty="No drops from this boss in this window." />
          </Panel>

          <Panel title="Players" className="lg:order-1">
            {data.players.length === 0 ? (
              <p className="text-sm text-muted">Nobody has a recorded kill in this window.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs tracking-wider text-muted uppercase">
                    <th className="w-8 pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Member</th>
                    <th className="pb-2 text-right font-medium">Kills</th>
                    <th className="pb-2 text-right font-medium">Drops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  {data.players.map((p, i) => (
                    <tr key={p.rsn}>
                      <td className="py-1.5 text-xs text-muted">{i + 1}</td>
                      <td className="py-1.5">
                        <Link href={`/members/${encodeURIComponent(p.rsn)}`} className="hover:text-gold">{p.rsn}</Link>
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{full(p.kills)}</td>
                      <td className={`py-1.5 text-right tabular-nums ${p.drops > 0 ? "text-gold" : "text-muted"}`}>{p.drops}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        {days.length > 1 && (
          <Panel title="Kills over time" hint="By the day each kill was recorded (the bot reads the adventure log about hourly).">
            <BarChart groups={days.map((d) => ({ label: shortDay(d.date), values: [d.kills] }))} series={[{ name: "Kills", color: "#e0627a" }]} height={180} format="full" />
          </Panel>
        )}
      </div>
    </div>
  );
}
