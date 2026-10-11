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
import type {
  PointsRedemptions,
  PointsReward,
  PointsRewards,
  WelcomeActionResult,
} from "@/lib/jonnybot-admin";

type RewardInput = { name: string; description: string; cost: number; stock: number | null; active: boolean };

interface Draft {
  id: string | null;
  name: string;
  description: string;
  cost: string;
  stock: string;
  active: boolean;
}

const EMPTY: Draft = { id: null, name: "", description: "", cost: "", stock: "", active: true };

/** The rewards members can spend points on, and the redemptions waiting for staff to hand over (or cancel and refund). */
export function PointsRewardsManager({
  rewards,
  redemptions,
  unit,
  save,
  handle,
}: {
  rewards: PointsRewards;
  redemptions: PointsRedemptions;
  unit: string;
  save: (id: string | null, input: RewardInput) => Promise<WelcomeActionResult<PointsRewards>>;
  handle: (id: string, fulfil: boolean) => Promise<WelcomeActionResult<PointsRedemptions>>;
}) {
  const router = useRouter();
  const [list, setList] = useState(rewards);
  const [queue, setQueue] = useState(redemptions);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function edit(r: PointsReward) {
    setDraft({ id: r.id, name: r.name, description: r.description, cost: String(r.cost), stock: r.stock === null ? "" : String(r.stock), active: r.active });
    setProblem(null);
    setNote(null);
  }

  function submit(next: Draft, message: string) {
    setProblem(null);
    setNote(null);
    const cost = Number(next.cost);
    const stock = next.stock.trim() === "" ? null : Number(next.stock);
    if (!Number.isInteger(cost) || (stock !== null && !Number.isInteger(stock)))
      return setProblem({ title: "The cost and stock must be whole numbers.", items: [] });
    start(async () => {
      const result = await save(next.id, { name: next.name, description: next.description, cost, stock, active: next.active });
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setList(result.data);
      setDraft(EMPTY);
      setNote(message);
      router.refresh();
    });
  }

  function act(id: string, fulfil: boolean) {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await handle(id, fulfil);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setQueue(result.data);
      setNote(fulfil ? "Marked as handed over. The member has been told." : "Cancelled and refunded. The member has been told.");
      router.refresh();
    });
  }

  return (
    <section className="space-y-5 rounded-xl border border-surface-border bg-surface p-5">
      <div>
        <h2 className="font-semibold text-gold">Rewards</h2>
        <p className="mt-1 text-xs text-muted">
          Things members can spend {unit} on with /points redeem. Staff hand the reward over, then mark it done here. Cancelling refunds the member.
        </p>
      </div>
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      <div>
        <h3 className="text-sm font-medium">Waiting to be handed over</h3>
        {queue.pending.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nobody is waiting for a reward.</p>
        ) : (
          <ul className="mt-2 divide-y divide-surface-border">
            {queue.pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{r.userName ?? "Someone who left"}</span> wants <span className="font-medium">{r.rewardName}</span>
                  <span className="block text-xs text-muted">
                    {r.cost.toLocaleString("en-GB")} {unit} · {formatUtc(r.createdAt)}
                  </span>
                </span>
                <span className="flex gap-2">
                  <button type="button" className={primaryButton} disabled={pending} onClick={() => act(r.id, true)}>
                    Handed over
                  </button>
                  <button
                    type="button"
                    className={dangerButton}
                    disabled={pending}
                    onClick={() => window.confirm("Cancel this and refund the member?") && act(r.id, false)}
                  >
                    Cancel and refund
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {queue.handled.length > 0 && (
          <details className="mt-3">
            <summary className={`${ghostButton} inline-block cursor-pointer`}>Recently handled ({queue.handled.length})</summary>
            <ul className="mt-2 divide-y divide-surface-border">
              {queue.handled.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    {r.userName ?? "Someone who left"} · {r.rewardName}
                    <span className="block text-xs text-muted">
                      {r.handledByName ? `By ${r.handledByName} · ` : ""}
                      {r.handledAt ? formatUtc(r.handledAt) : ""}
                    </span>
                  </span>
                  <StatusBadge tone={r.status === "FULFILLED" ? "good" : "warn"}>{r.status === "FULFILLED" ? "Handed over" : "Cancelled"}</StatusBadge>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium">Catalogue</h3>
        {list.rewards.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No rewards yet. Add the first one below.</p>
        ) : (
          <ul className="mt-2 grid gap-3 xl:grid-cols-2">
            {list.rewards.map((r) => (
              <li key={r.id} className={`flex flex-col gap-1 rounded-lg border border-surface-border p-3 text-sm ${r.active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{r.name}</span>
                  <span className="tabular-nums">
                    {r.cost.toLocaleString("en-GB")} {unit}
                  </span>
                </div>
                {r.description && <p className="break-words text-muted">{r.description}</p>}
                <p className="text-xs text-muted">
                  {r.stock === null ? "Unlimited" : r.stock === 0 ? "Sold out" : `${r.stock} left`}
                  {r.active ? "" : " · Archived"}
                </p>
                <div className="mt-1 flex gap-2">
                  <button type="button" className={ghostButton} onClick={() => edit(r)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className={ghostButton}
                    disabled={pending}
                    onClick={() =>
                      submit(
                        { id: r.id, name: r.name, description: r.description, cost: String(r.cost), stock: r.stock === null ? "" : String(r.stock), active: !r.active },
                        r.active ? "Archived. Members can no longer see it." : "Restored.",
                      )
                    }
                  >
                    {r.active ? "Archive" : "Restore"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-surface-border p-4">
        <h3 className="text-sm font-medium">{draft.id ? "Edit reward" : "Add a reward"}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_8rem_8rem]">
          <input className={inputClass} placeholder="Name, e.g. Custom role colour" aria-label="Reward name" maxLength={60} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className={inputClass} placeholder={`Cost in ${unit}`} aria-label="Cost" inputMode="numeric" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} />
          <input className={inputClass} placeholder="Stock (empty = unlimited)" aria-label="Stock" inputMode="numeric" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
          <div className="md:col-span-3">
            <input className={inputClass} placeholder="Short description (optional)" aria-label="Description" maxLength={200} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" className={primaryButton} disabled={pending || !draft.name.trim() || !draft.cost.trim()} onClick={() => submit(draft, draft.id ? "Reward saved." : "Reward added.")}>
            {draft.id ? "Save reward" : "Add reward"}
          </button>
          {draft.id && (
            <button type="button" className={ghostButton} onClick={() => setDraft(EMPTY)}>
              Cancel editing
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
