import Link from "next/link";
import { PageHeader, Panel, ProgressBar, Unavailable } from "@/components/site/blocks";
import { getSignups, shortDate } from "@/lib/site";

export const metadata = { title: "Signups — Younglings" };
export const dynamic = "force-dynamic";

export default async function SignupsPage() {
  const sheets = await getSignups();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Signups" subtitle="Open signup sheets and who's on them, in queue order. Sign up in Discord." />

      {sheets === null ? (
        <Unavailable what="Signups" />
      ) : sheets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">No signup sheets are open right now.</div>
      ) : (
        sheets.map((sheet) => (
          <Panel key={sheet.id}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">{sheet.title}</h2>
              <span className="text-xs text-muted">opened {shortDate(sheet.createdAt)}</span>
            </div>
            {sheet.note && <p className="mb-3 text-sm whitespace-pre-line text-muted">{sheet.note}</p>}
            {sheet.max !== null && (
              <div className="mb-4">
                <ProgressBar value={Math.min(sheet.entries.length, sheet.max)} max={sheet.max} />
                <p className="mt-1 text-xs text-muted">
                  {Math.min(sheet.entries.length, sheet.max)} of {sheet.max} places filled
                  {sheet.entries.length > sheet.max ? ` · ${sheet.entries.length - sheet.max} on the waiting list` : ""}
                </p>
              </div>
            )}
            {sheet.entries.length === 0 ? (
              <p className="text-sm text-muted">Nobody has signed up yet.</p>
            ) : (
              <ol className="grid gap-1.5 sm:grid-cols-2">
                {sheet.entries.map((e, i) => {
                  const waiting = sheet.max !== null && i >= sheet.max;
                  return (
                    <li key={`${e.rsn}-${e.position}`} className={`flex items-center gap-3 rounded-md border border-surface-border/60 px-3 py-1.5 text-sm ${waiting ? "opacity-60" : "bg-background/40"}`}>
                      <span className="w-6 text-xs text-muted">{i + 1}</span>
                      <Link href={`/members/${encodeURIComponent(e.rsn)}`} className="truncate hover:text-gold">
                        {e.rsn}
                      </Link>
                      {waiting && <span className="ml-auto text-[11px] text-muted">waiting</span>}
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        ))
      )}
    </div>
  );
}
