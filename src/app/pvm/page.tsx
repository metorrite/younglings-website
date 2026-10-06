import Image from "next/image";
import Link from "next/link";
import { PageHeader, StatTile, Unavailable } from "@/components/site/blocks";
import { TimeFrame } from "@/components/site/TimeFrame";
import { full, getBosses, normalisePeriod } from "@/lib/site";

export const metadata = { title: "PvM & bosses — Younglings" };
export const dynamic = "force-dynamic";

export default async function PvmPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const query = await searchParams;
  const period = normalisePeriod(query.period) ?? "all";
  const data = await getBosses(period);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="PvM & bosses" subtitle="Boss kills and notable drops from members' adventure logs. Pick a boss for its full breakdown, or open the drop log to filter across bosses." />

      <TimeFrame current={data?.period.token ?? period} label={data?.period.label ?? "…"} />

      {data === null ? (
        <Unavailable what="PvM stats" />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Boss kills" value={full(data.totals.kills)} />
            <StatTile label="Bosses fought" value={data.totals.bosses} />
            <StatTile label="Members killing" value={data.totals.players} />
            <StatTile label="Notable drops" value={full(data.totals.drops)} href={`/drops${period !== "all" ? `?period=${period}` : ""}`} sub="Open the drop log →" />
          </section>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.bosses.map((boss) => {
              const quiet = boss.kills === 0;
              return (
                <li key={boss.key}>
                  <Link
                    href={`/pvm/${boss.key}${period !== "all" ? `?period=${period}` : ""}`}
                    className={`group relative block h-44 overflow-hidden rounded-xl border bg-surface transition hover:border-gold/60 ${quiet ? "border-surface-border/50" : "border-surface-border"}`}
                  >
                    {boss.image && (
                      <Image
                        src={boss.image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className={`object-cover object-top transition duration-500 group-hover:scale-105 ${quiet ? "opacity-20 grayscale" : "opacity-60"}`}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="truncate text-lg font-semibold text-gold drop-shadow">{boss.name}</p>
                      <p className="mt-0.5 text-sm text-foreground/90">
                        {quiet ? <span className="text-muted">No kills in this window</span> : <>{full(boss.kills)} kills · {boss.players} {boss.players === 1 ? "member" : "members"}</>}
                        {boss.drops > 0 && <span className="text-gold"> · {boss.drops} {boss.drops === 1 ? "drop" : "drops"}</span>}
                      </p>
                      {boss.topKiller && <p className="truncate text-xs text-muted">Most kills: {boss.topKiller.rsn} ({full(boss.topKiller.kills)})</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
