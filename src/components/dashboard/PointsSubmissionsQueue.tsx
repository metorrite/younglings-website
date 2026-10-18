"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  dangerButton,
  formatUtc,
  ghostButton,
  inputClass,
  Notice,
  primaryButton,
  StatusBadge,
} from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import type {
  PointsSubmission,
  PointsSubmissions,
  WelcomeActionResult,
} from "@/lib/jonnybot-admin";

/** Screenshots members sent with /points submit: staff pick an amount and approve, or say why not. Decided ones are listed below. */
export function PointsSubmissionsQueue({
  initial,
  unit,
  decide,
}: {
  initial: PointsSubmissions;
  unit: string;
  decide: (
    id: string,
    input: { approve: boolean; points?: number; note?: string },
  ) => Promise<WelcomeActionResult<PointsSubmissions>>;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function act(s: PointsSubmission, approve: boolean) {
    setProblem(null);
    setNote(null);
    const points = Number(amounts[s.id] ?? "");
    if (approve && (!Number.isInteger(points) || points <= 0))
      return setProblem({ title: `Enter how many ${unit} to give for submission #${s.id}.`, items: [] });
    start(async () => {
      const result = await decide(s.id, { approve, points: approve ? points : undefined, note: notes[s.id] ?? "" });
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setData(result.data);
      setNote(approve ? "Approved. The member has been paid and told." : "Denied. The member has been told.");
      router.refresh();
    });
  }

  return (
    <CollapsibleCard
      id="points-submissions"
      title="Submissions"
      hint="Members send a screenshot with /points submit. Approving pays exactly once, even if two staff click at the same time."
      defaultOpen={initial.pending.length > 0}
      summary={<Chip tone={data.pending.length > 0 ? "warn" : "plain"}>{data.pending.length > 0 ? `${data.pending.length} waiting` : "Nothing waiting"}</Chip>}
    >
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      {data.pending.length === 0 ? (
        <p className="rounded-lg border border-dashed border-surface-border p-4 text-center text-sm text-muted">Nothing is waiting for review.</p>
      ) : (
        <PanelGrid min="22rem" gap="gap-4">
          {data.pending.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 rounded-lg border border-surface-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {s.userName ?? "Someone who left"} <span className="text-xs font-normal text-muted">#{s.id}</span>
                </p>
                <p className="text-xs text-muted">{formatUtc(s.createdAt)}</p>
              </div>
              <p className="break-words whitespace-pre-wrap text-sm">{s.description}</p>
              <a href={s.proofUrl} target="_blank" rel="noreferrer noopener" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.proofUrl} alt={`Proof for submission ${s.id}`} className="max-h-72 w-full rounded-md border border-surface-border object-contain" loading="lazy" />
              </a>
              <div className="flex flex-wrap gap-2">
                <div className="w-32">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    placeholder={`${unit} to give`}
                    aria-label={`Points to give for submission ${s.id}`}
                    value={amounts[s.id] ?? ""}
                    onChange={(e) => setAmounts({ ...amounts, [s.id]: e.target.value })}
                  />
                </div>
                <div className="min-w-48 max-w-80 flex-1">
                  <input
                    className={inputClass}
                    maxLength={200}
                    placeholder="Note for the member (required to deny)"
                    aria-label={`Note for submission ${s.id}`}
                    value={notes[s.id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primaryButton} disabled={pending} onClick={() => act(s, true)}>
                  Approve
                </button>
                <button
                  type="button"
                  className={dangerButton}
                  disabled={pending || !(notes[s.id] ?? "").trim()}
                  onClick={() => act(s, false)}
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </PanelGrid>
      )}

      {data.decided.length > 0 && (
        <details>
          <summary className={`${ghostButton} inline-block cursor-pointer`}>Recently decided ({data.decided.length})</summary>
          <ul className="mt-3 divide-y divide-surface-border">
            {data.decided.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {s.userName ?? "Someone who left"} <span className="text-xs font-normal text-muted">#{s.id}</span>
                  </span>
                  <StatusBadge tone={s.status === "APPROVED" ? "good" : "warn"}>
                    {s.status === "APPROVED" ? `Approved · ${(s.pointsAwarded ?? 0).toLocaleString("en-GB")} ${unit}` : "Denied"}
                  </StatusBadge>
                </div>
                <p className="break-words text-muted">{s.description}</p>
                {s.decisionNote && <p className="break-words text-xs">Note: {s.decisionNote}</p>}
                <p className="text-xs text-muted">
                  {s.decidedByName ? `By ${s.decidedByName} · ` : ""}
                  {s.decidedAt ? formatUtc(s.decidedAt) : ""}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </CollapsibleCard>
  );
}
