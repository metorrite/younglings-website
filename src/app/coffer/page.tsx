import { BarChart, RankedBars } from "@/components/charts";
import { PageHeader, Panel, StatTile, Unavailable } from "@/components/site/blocks";
import { compact, full, getCoffer, shortDate, shortDay } from "@/lib/site";

export const metadata = { title: "Clan Coffer — Younglings" };
// Rendered per request (the bot's data isn't reachable at build time); the fetches are cached for a few minutes.
export const dynamic = "force-dynamic";

const gp = (n: number) => `${compact(n)} gp`;

export default async function CofferPage() {
  const coffer = await getCoffer();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Clan Coffer" subtitle="What members have donated and how it's been given back. Totals only — individual balances stay private." />

      {coffer === null ? (
        <Unavailable what="The coffer" />
      ) : coffer.donations === 0 && coffer.giveaways === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">
          Nothing has been recorded in the coffer yet. Donations logged with the bot will show up here.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Total donated" value={gp(coffer.donated)} sub={`${full(coffer.donated)} gp`} />
            <StatTile label="Donations" value={full(coffer.donations)} sub={`from ${coffer.donors} donor${coffer.donors === 1 ? "" : "s"}`} />
            <StatTile label="Held for members" value={gp(coffer.held)} />
            <StatTile label="Given away" value={gp(coffer.givenAway)} sub={`${coffer.giveaways} giveaway${coffer.giveaways === 1 ? "" : "s"}`} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Donated per week">
              {coffer.weeks.length > 0 ? (
                <BarChart groups={coffer.weeks.map((w) => ({ label: shortDay(w.weekStart), values: [w.donated] }))} series={[{ name: "Donated", color: "#d4af37" }]} format="compact" />
              ) : (
                <p className="py-8 text-center text-sm text-muted">No donations in the last few months.</p>
              )}
            </Panel>
            <Panel title="Top donors">
              <RankedBars rows={coffer.topDonors.map((d) => ({ label: d.name, value: d.total }))} format={gp} />
            </Panel>
          </div>

          {coffer.recentGiveaways.length > 0 && (
            <Panel title="Recent giveaways">
              <ul className="divide-y divide-surface-border/60 text-sm">
                {coffer.recentGiveaways.map((g, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{g.description || "Giveaway"}</span>
                      <span className="block text-xs text-muted">{shortDate(g.at)}</span>
                    </span>
                    <span className="shrink-0 font-mono text-gold">{gp(g.amount)}</span>
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
