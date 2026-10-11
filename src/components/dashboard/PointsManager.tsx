"use client";

import { useState, useTransition } from "react";
import {
  Card,
  FormField,
  formatUtc,
  inputClass,
  Notice,
  primaryButton,
} from "@/components/admin/ui";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { PointsOverview, WelcomeActionResult } from "@/lib/jonnybot-admin";

export interface PointsActions {
  saveSettings: (input: { enabled: boolean; unit: string }) => Promise<WelcomeActionResult<PointsOverview>>;
  award: (input: { userId: string; points: number; reason: string }) => Promise<WelcomeActionResult<PointsOverview>>;
}

const CATEGORY: Record<string, string> = {
  MANUAL: "Awarded",
  EVENT: "Event",
  SUBMISSION: "Submission",
  DONATION: "Donation",
  REDEMPTION: "Reward",
  ADJUSTMENT: "Adjustment",
};

function amount(n: number): string {
  return (n > 0 ? "+" : "") + n.toLocaleString("en-GB");
}

/** Settings, an award form, the leaderboard and the newest ledger entries for a server's points. */
export function PointsManager({
  initial,
  actions,
}: {
  initial: PointsOverview;
  actions: PointsActions;
}) {
  const [data, setData] = useState(initial);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [unit, setUnit] = useState(initial.unit);
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirty = enabled !== data.enabled || unit.trim() !== data.unit;

  function saveSettings() {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await actions.saveSettings({ enabled, unit: unit.trim() });
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setData(result.data);
      setEnabled(result.data.enabled);
      setUnit(result.data.unit);
      setNote("Settings saved.");
    });
  }

  function award() {
    setProblem(null);
    setNote(null);
    const n = Number(points);
    if (!Number.isInteger(n) || n === 0)
      return setProblem({ title: "Enter a whole number of points, not zero. Use a negative number to take some back.", items: [] });
    start(async () => {
      const result = await actions.award({ userId, points: n, reason });
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setData(result.data);
      setPoints("");
      setReason("");
      setNote(n > 0 ? "Points given." : "Points taken back.");
    });
  }

  const totals = data.totals;

  return (
    <div className="space-y-6">
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      <Card title="Settings" hint="Members can check their balance with /points balance and see the leaderboard with /points top once this is on.">
        <div className="space-y-4">
          <Toggle
            checked={enabled}
            onChange={setEnabled}
            label="Use points in this server"
            detail="While off, the /points commands tell members it isn't switched on. Nothing already recorded is lost."
          />
          <FormField label="What the points are called" hint="For example points, tickets or coins.">
            <input className={`${inputClass} max-w-xs`} value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} />
          </FormField>
          <button type="button" className={primaryButton} disabled={pending || !dirty} onClick={saveSettings}>
            Save settings
          </button>
        </div>
      </Card>

      <Card
        title="Give or take points"
        hint={`One entry can move up to ${data.maxPerEntry.toLocaleString("en-GB")}. A reason is required and stays in the history. Taking points back can't take someone below zero.`}
      >
        <div className="grid gap-4 md:grid-cols-[1fr_9rem]">
          <FormField label="Member's Discord user ID" hint="Right-click them with Developer Mode on, then Copy User ID. Or use a name's Award button on the leaderboard.">
            <input className={inputClass} value={userId} inputMode="numeric" placeholder="e.g. 231145573753815040" onChange={(e) => setUserId(e.target.value)} />
          </FormField>
          <FormField label="Amount" hint="Negative takes back.">
            <input className={inputClass} value={points} inputMode="numeric" placeholder="50" onChange={(e) => setPoints(e.target.value)} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Reason">
              <input className={inputClass} value={reason} maxLength={200} placeholder="Hosted the Friday raid" onChange={(e) => setReason(e.target.value)} />
            </FormField>
          </div>
        </div>
        <div className="mt-4">
          <button type="button" className={primaryButton} disabled={pending || !userId.trim() || !points.trim() || !reason.trim()} onClick={award}>
            Record it
          </button>
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Members with points", totals.members],
          ["In circulation", totals.outstanding],
          ["Ever given", totals.awarded],
          ["Spent or taken back", totals.spent],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-surface-border bg-surface p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{(value as number).toLocaleString("en-GB")}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-surface-border bg-surface p-5">
          <h2 className="font-semibold text-gold">Leaderboard</h2>
          {data.top.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nobody has any {data.unit} yet.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {data.top.map((row, i) => (
                <li key={row.userId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 w-6 text-right text-xs text-muted tabular-nums">{i + 1}.</span>
                    {row.userName ?? "Someone who left"}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-medium tabular-nums">{row.points.toLocaleString("en-GB")}</span>
                    <button type="button" className="text-xs text-gold underline" onClick={() => setUserId(row.userId)}>
                      Award
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-surface-border bg-surface p-5">
          <h2 className="font-semibold text-gold">Latest history</h2>
          {data.recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing has been recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-surface-border">
              {data.recent.map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">{e.userName ?? "Someone who left"}</span>
                    <span className={`font-semibold tabular-nums ${e.points < 0 ? "text-red-400" : "text-emerald-400"}`}>{amount(e.points)}</span>
                  </div>
                  <p className="break-words text-muted">{e.reason}</p>
                  <p className="text-xs text-muted">
                    {CATEGORY[e.category] ?? e.category}
                    {e.awardedByName ? ` by ${e.awardedByName}` : ""} · {formatUtc(e.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
