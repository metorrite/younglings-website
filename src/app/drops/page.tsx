import { DropGrid, DropList } from "@/components/pvm/DropViews";
import { PageHeader, Panel, StatTile, Unavailable } from "@/components/site/blocks";
import { BossFilter } from "@/components/site/BossFilter";
import { TimeFrame } from "@/components/site/TimeFrame";
import { full, getDropLog, normalisePeriod } from "@/lib/site";

export const metadata = { title: "Drop log — Younglings" };
export const dynamic = "force-dynamic";

export default async function DropLogPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const query = await searchParams;
  const period = normalisePeriod(query.period) ?? "all";
  const bosses = typeof query.bosses === "string" ? query.bosses.split(",").filter((b) => /^[a-z0-9_]+$/.test(b)) : [];
  const data = await getDropLog(period, bosses.join(",") || null);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Drop log" subtitle="The clan's drops as a collection log. Filter by boss and time frame; items turn up in colour as they're received." />

      <TimeFrame current={data?.period.token ?? period} label={data?.period.label ?? "…"} />

      {data === null ? (
        <Unavailable what="The drop log" />
      ) : (
        <>
          <BossFilter options={data.bosses} selected={bosses} />

          <section className="grid grid-cols-3 gap-3">
            <StatTile label="Drops" value={full(data.total)} />
            <StatTile label="Different items" value={data.uniqueItems} />
            <StatTile label="Members" value={data.receivers} />
          </section>

          <Panel title="Collection" hint="Greyed-out items haven't been received in this window. Open one for a full breakdown.">
            <DropGrid cells={data.grid} period={period} boss={bosses.length === 1 ? bosses[0] : null} />
          </Panel>

          <Panel title="Recent drops">
            <DropList entries={data.list} />
          </Panel>
        </>
      )}
    </div>
  );
}
