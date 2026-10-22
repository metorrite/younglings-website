"use client";

import { useState, useTransition } from "react";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import type { PluginPointsView } from "@/lib/jonnybot-admin";

export type PluginPointsSave = (rules: PluginPointsView["rules"]) => Promise<{ ok: true; data: PluginPointsView } | { ok: false; error: string }>;

const field = "w-24 rounded-md border border-control-border bg-background px-2 py-1.5 text-sm tabular-nums outline-none focus:border-gold disabled:opacity-50";

/** A whole number from a box, clamped; empty means 0. */
function whole(text: string, max: number): number {
  const n = Math.floor(Number(text.replace(/[^\d]/g, "")) || 0);
  return Math.min(Math.max(n, 0), max);
}

/**
 * "Points for plugin reports" on the Clan plugin page (T-061): how many clan points each kind of RuneSync report earns a member here, with an
 * optional daily cap per kind and, for drops, the smallest value that pays. Everything is 0 (off) until staff set it. Points are only paid
 * while the server uses points, and never twice for the same report.
 */
export function PluginPointsForm({ initial, save }: { initial: PluginPointsView; save: PluginPointsSave }) {
  const [saved, setSaved] = useState(initial);
  const [rules, setRules] = useState(initial.rules);
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(rules) !== JSON.stringify(saved.rules);

  const change = (type: string, patch: Partial<PluginPointsView["rules"][number]>) => setRules((all) => all.map((r) => (r.type === type ? { ...r, ...patch } : r)));

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save(rules);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error });
      setSaved(result.data);
      setRules(result.data.rules);
      setOutcome({ tone: "success", title: "Saved. New reports from RuneSync earn these points." });
    });
  }

  return (
    <div className="space-y-4">
      {!saved.pointsEnabled && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Clan points are off in this server, so nothing is paid until they are switched on (Points page).
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-2 pr-3 font-normal">Report</th>
              <th className="py-2 pr-3 font-normal">{saved.unit || "Points"} each</th>
              <th className="py-2 pr-3 font-normal">Daily cap (0 = none)</th>
              <th className="py-2 font-normal">Smallest value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/60">
            {rules.map((r) => (
              <tr key={r.type}>
                <td className="py-2 pr-3">{r.label}</td>
                <td className="py-2 pr-3">
                  <input className={field} inputMode="numeric" aria-label={`${r.label}: points each`} value={String(r.points)} disabled={pending}
                    onChange={(e) => change(r.type, { points: whole(e.target.value, saved.maxPoints) })} />
                </td>
                <td className="py-2 pr-3">
                  <input className={field} inputMode="numeric" aria-label={`${r.label}: daily cap`} value={String(r.dailyCap)} disabled={pending}
                    onChange={(e) => change(r.type, { dailyCap: whole(e.target.value, 1_000_000) })} />
                </td>
                <td className="py-2">
                  {r.minValueGp !== undefined ? (
                    <span className="inline-flex items-center gap-1">
                      <input className={`${field} w-32`} inputMode="numeric" aria-label={`${r.label}: smallest value in gp`} value={String(r.minValueGp)} disabled={pending}
                        onChange={(e) => change(r.type, { minValueGp: whole(e.target.value, 2_147_483_647) })} />
                      <span className="text-xs text-muted">gp</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Paid once per report, in the server where the member is, and only for what the member chose to share. Drop values are JonnyBot&apos;s Grand Exchange prices; a drop without a
        price never pays. An award that would pass the day&apos;s cap (UTC) is skipped.
      </p>
      <SaveBar pending={pending} onSave={submit} outcome={outcome} dirty={dirty} onDiscard={() => setRules(saved.rules)} />
    </div>
  );
}
