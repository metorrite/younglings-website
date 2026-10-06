import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Panel, Unavailable } from "@/components/site/blocks";
import { recapPath } from "@/lib/recap";
import { RECAP_PERIODS, getRoster } from "@/lib/site";

export const metadata = { title: "Recaps — Younglings" };
export const dynamic = "force-dynamic";

export default async function RecapHubPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const query = await searchParams;
  const rsn = typeof query.rsn === "string" ? query.rsn.trim() : "";
  const period = typeof query.period === "string" && RECAP_PERIODS.some((p) => p.token === query.period) ? query.period : "month";
  if (rsn) redirect(recapPath("member", period, rsn));

  const roster = await getRoster();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Recaps" subtitle="Your year in review — and your week, your month, or everything so far. Animated, shareable, and the same card the Discord bot posts with /wrapped." />

      <Panel title="The whole clan">
        <div className="flex flex-wrap gap-2">
          {RECAP_PERIODS.map((p) => (
            <Link key={p.token} href={recapPath("clan", p.token)} className="rounded-full border border-surface-border px-4 py-2 text-sm transition hover:border-gold hover:text-gold">
              {p.label}
            </Link>
          ))}
        </div>
      </Panel>

      <Panel title="A member">
        {roster === null ? (
          <Unavailable what="The member list" />
        ) : (
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="min-w-56 flex-1 text-sm">
              <span className="mb-1 block text-xs text-muted">Member</span>
              <input name="rsn" list="roster" required placeholder="Start typing a name…" className="w-full rounded-md border border-surface-border bg-background px-3 py-2 outline-none focus:border-gold" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">Period</span>
              <select name="period" defaultValue="month" className="rounded-md border border-surface-border bg-background px-3 py-2 outline-none focus:border-gold">
                {RECAP_PERIODS.map((p) => (
                  <option key={p.token} value={p.token}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-md bg-gold px-5 py-2 text-sm font-semibold text-background transition hover:brightness-110">
              Show recap
            </button>
            <datalist id="roster">
              {roster.members.map((m) => (
                <option key={m.rsn} value={m.rsn} />
              ))}
            </datalist>
          </form>
        )}
      </Panel>
    </div>
  );
}
