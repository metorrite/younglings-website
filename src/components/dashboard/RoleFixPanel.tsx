"use client";

import { useEffect, useState, useTransition } from "react";
import { ghostButton, Notice, primaryButton } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import type { RoleFixEntry, RoleFixPlan, RoleFixStatus } from "@/lib/jonnybot-admin";

type Result<T> = Promise<{ ok: true; data: T } | { ok: false; error: string; problems: string[] }>;

export interface RoleFixActions {
  plan: () => Result<RoleFixPlan>;
  apply: (userIds: string[]) => Result<RoleFixStatus>;
  status: () => Result<RoleFixStatus>;
}

/**
 * Step 1: "Check who needs fixing" lists the people who would be promoted (in the clan, still Guest) and demoted (left the clan, still Member); it changes
 * nobody. Step 2: tick the people and press Apply. Nothing is ticked for you. A fresh list is made when you press Apply, so only people who still need it
 * are changed. Only the Member / Guest / Unverified roles are touched.
 */
export function RoleFixPanel({ initial, actions }: { initial: RoleFixStatus; actions: RoleFixActions }) {
  const [plan, setPlan] = useState<RoleFixPlan | null>(null);
  const [status, setStatus] = useState(initial);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const running = status.progress?.running === true;

  // while a fix runs, look at how far it is every few seconds
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      void actions.status().then((r) => {
        if (r.ok) setStatus(r.data);
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [running, actions]);

  const promotions = plan?.entries.filter((e) => e.action === "PROMOTE") ?? [];
  const demotions = plan?.entries.filter((e) => e.action === "DEMOTE") ?? [];

  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const tickAll = (entries: RoleFixEntry[]) => setTicked((prev) => new Set([...prev, ...entries.map((e) => e.userId)]));

  function check() {
    setError(null);
    start(async () => {
      const result = await actions.plan();
      if (!result.ok) return setError(result.error);
      setPlan(result.data);
      setStatus({ max: result.data.max, progress: result.data.progress });
      setTicked(new Set());
    });
  }

  function apply() {
    if (!window.confirm(`Change the roles of ${ticked.size} real member(s) now? This promotes or demotes them in Discord.`)) return;
    setError(null);
    start(async () => {
      const result = await actions.apply([...ticked]);
      if (!result.ok) return setError(result.error);
      setStatus(result.data);
      setTicked(new Set());
    });
  }

  const row = (e: RoleFixEntry) => (
    <li key={e.userId} className="flex items-start gap-3 py-2 text-sm">
      <input id={`fix-${e.userId}`} type="checkbox" className="mt-1" checked={ticked.has(e.userId)} disabled={running || pending} onChange={() => toggle(e.userId)} />
      <label htmlFor={`fix-${e.userId}`} className="min-w-0 flex-1">
        <strong>{e.name}</strong> <span className="text-muted">({e.rsn})</span>
        <span className="block text-xs text-muted">
          {e.add.length > 0 && <>gets {e.add.join(", ")}</>}
          {e.add.length > 0 && e.remove.length > 0 && " · "}
          {e.remove.length > 0 && <>loses {e.remove.join(", ")}</>}
        </span>
      </label>
    </li>
  );

  return (
    <div className="space-y-6">
      {error && <Notice tone="error" title={error} />}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButton} disabled={pending || running} onClick={check}>
          Check who needs fixing
        </button>
        <span className="text-sm text-muted">This only makes a list. Nobody is changed until you tick people and press Apply.</span>
      </div>

      {status.progress && (
        <div role="status" className="rounded-lg border border-gold/40 p-4 text-sm">
          <Chip tone={status.progress.running ? "warn" : "good"}>{status.progress.running ? "Running" : "Finished"}</Chip>{" "}
          {status.progress.done} of {status.progress.total} changed{status.progress.failed > 0 ? `, ${status.progress.failed} could not be changed` : ""}.
        </div>
      )}

      {plan?.problem && <Notice tone="error" title={plan.problem} />}
      {plan && !plan.problem && (
        <>
          <p className="text-sm text-muted">
            Looked at {plan.linkedAccounts} linked people{plan.notInServer > 0 ? ` (${plan.notInServer} are no longer in the server and were skipped)` : ""}. {plan.entries.length === 0 ? "Everyone is already right." : ""}
          </p>
          {promotions.length > 0 && (
            <CollapsibleCard id="fix-promote" title="Would be promoted" defaultOpen summary={<Chip tone="good">{promotions.length}</Chip>} hint="In the clan but not holding the Member role.">
              <div className="mb-2">
                <button type="button" className={ghostButton} onClick={() => tickAll(promotions)}>
                  Tick all {promotions.length}
                </button>
              </div>
              <ul className="divide-y divide-white/10">{promotions.map(row)}</ul>
            </CollapsibleCard>
          )}
          {demotions.length > 0 && (
            <CollapsibleCard id="fix-demote" title="Would be demoted" defaultOpen summary={<Chip tone="warn">{demotions.length}</Chip>} hint="Not in the clan (by the stored roster) but still holding the Member role. Check these with care: the roster must be right.">
              <div className="mb-2">
                <button type="button" className={ghostButton} onClick={() => tickAll(demotions)}>
                  Tick all {demotions.length}
                </button>
              </div>
              <ul className="divide-y divide-white/10">{demotions.map(row)}</ul>
            </CollapsibleCard>
          )}
          {plan.entries.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={primaryButton} disabled={pending || running || ticked.size === 0 || ticked.size > status.max} onClick={apply}>
                Apply to {ticked.size} selected
              </button>
              <span className="text-sm text-muted">Up to {status.max} at a time.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
