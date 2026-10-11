"use client";

import { useState, useTransition } from "react";
import { dangerButton, formatUtc, ghostButton, inputClass, Notice, StatusBadge } from "@/components/admin/ui";
import type { ClanListings, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Result = Promise<WelcomeActionResult<ClanListings>>;

export interface ListingsActions {
  suspend: (guildId: string, reason: string) => Result;
  restore: (guildId: string) => Result;
  resolve: (id: string, status: "DISMISSED" | "ACTIONED") => Result;
}

/** The bot owner's view of the clan directory: every shared listing and every open report, with suspend and restore. */
export function ListingsModerator({ initial, actions }: { initial: ClanListings; actions: ListingsActions }) {
  const [data, setData] = useState(initial);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(work: () => Result, done: string) {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await work();
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setData(result.data);
      setNote(done);
    });
  }

  if (!data.canEdit) {
    return <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">Only the bot&apos;s owner can moderate the directory.</p>;
  }

  return (
    <div className="space-y-6">
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Open reports</h2>
        {data.reports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">No open reports.</p>
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {data.reports.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{r.displayName ?? r.slug ?? r.guildId}</p>
                  <p className="text-xs text-muted">{formatUtc(r.createdAt)}</p>
                </div>
                <p className="break-words whitespace-pre-wrap text-sm">{r.reason}</p>
                {r.reporter && <p className="text-xs text-muted">Reported by {r.reporter}</p>}
                <div className="mt-auto flex flex-wrap gap-2">
                  <button type="button" className={ghostButton} disabled={pending} onClick={() => run(() => actions.resolve(r.id, "DISMISSED"), "Report dismissed.")}>
                    Dismiss
                  </button>
                  <button type="button" className={ghostButton} disabled={pending} onClick={() => run(() => actions.resolve(r.id, "ACTIONED"), "Report closed as actioned.")}>
                    Mark actioned
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Shared listings</h2>
        {data.listings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">No clan has shared a profile yet.</p>
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {data.listings.map((l) => (
              <li key={l.guildId} className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5">
                <div>
                  <p className="font-semibold">{l.displayName || l.slug || "Unnamed clan"}</p>
                  <p className="text-xs text-muted">
                    {l.serverName ?? l.guildId} · {l.slug ? `/${l.slug}` : "no address yet"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={l.suspended ? "warn" : l.listing === "LISTED" ? "good" : "muted"}>
                    {l.suspended ? "Suspended" : l.listing === "LISTED" ? "Listed" : l.listing === "UNLISTED" ? "Unlisted" : "Hidden"}
                  </StatusBadge>
                  <StatusBadge tone={l.verified ? "good" : "muted"}>{l.verified ? "Verified" : "Not verified"}</StatusBadge>
                  {l.openReports > 0 && <StatusBadge tone="warn">{l.openReports} open {l.openReports === 1 ? "report" : "reports"}</StatusBadge>}
                </div>
                {l.suspended && l.suspendedReason && <p className="text-sm text-amber-300">{l.suspendedReason}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  {l.suspended ? (
                    <button type="button" className={ghostButton} disabled={pending} onClick={() => run(() => actions.restore(l.guildId), "Listing restored. The clan can share it again.")}>
                      Restore
                    </button>
                  ) : (
                    <>
                      <input
                        className={`${inputClass} max-w-xs`}
                        placeholder="Reason (shown to the clan)"
                        aria-label="Suspension reason"
                        value={reasons[l.guildId] ?? ""}
                        maxLength={300}
                        onChange={(e) => setReasons((r) => ({ ...r, [l.guildId]: e.target.value }))}
                      />
                      <button
                        type="button"
                        className={dangerButton}
                        disabled={pending || !(reasons[l.guildId] ?? "").trim()}
                        onClick={() => run(() => actions.suspend(l.guildId, reasons[l.guildId]), "Listing suspended.")}
                      >
                        Suspend
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
