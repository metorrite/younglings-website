"use client";

import { useState, useTransition } from "react";
import { saveClanPointsAction } from "@/app/admin/(console)/actions";
import type { ClanPoints } from "@/lib/jonnybot-admin";
import { Card, FormField, inputClass, Notice, primaryButton } from "./ui";

export function ClanPointsForm({ initial }: { initial: ClanPoints }) {
  const [s, setS] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const num = (value: string) => Math.max(0, Math.trunc(Number(value) || 0));
  const setValue = (patch: Partial<ClanPoints>) => {
    setS((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await saveClanPointsAction({
        dailyMembershipPoints: s.dailyMembershipPoints,
        citadelVisitPoints: s.citadelVisitPoints,
        citadelCapPoints: s.citadelCapPoints,
        ranks: s.ranks.map((r) => ({ id: r.id, threshold: r.threshold })),
      });
      if (!result.ok) setError(result.error);
      else {
        setS(result.data);
        setSaved(true);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card title="Points awarded" hint="How many points members earn. Changes apply to future awards; points already earned stay.">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Daily membership">
            <input type="number" min={0} className={inputClass} value={s.dailyMembershipPoints} onChange={(e) => setValue({ dailyMembershipPoints: num(e.target.value) })} />
          </FormField>
          <FormField label="Citadel visit">
            <input type="number" min={0} className={inputClass} value={s.citadelVisitPoints} onChange={(e) => setValue({ citadelVisitPoints: num(e.target.value) })} />
          </FormField>
          <FormField label="Citadel cap">
            <input type="number" min={0} className={inputClass} value={s.citadelCapPoints} onChange={(e) => setValue({ citadelCapPoints: num(e.target.value) })} />
          </FormField>
        </div>
      </Card>

      <Card title="Points needed for each rank" hint="Total points a member needs to be eligible for the rank. 0 means the rank isn't points-based.">
        <ul className="grid gap-3 sm:grid-cols-2">
          {[...s.ranks].sort((a, b) => a.order - b.order).map((rank) => (
            <li key={rank.id} className="flex items-center justify-between gap-3 rounded-md border border-surface-border bg-background/40 px-3 py-2">
              <span className="text-sm">{rank.name}</span>
              <input
                type="number"
                min={0}
                aria-label={`${rank.name} threshold`}
                className={`${inputClass} w-28`}
                value={rank.threshold}
                onChange={(e) => setValue({ ranks: s.ranks.map((r) => (r.id === rank.id ? { ...r, threshold: num(e.target.value) } : r)) })}
              />
            </li>
          ))}
        </ul>
      </Card>

      {error && <Notice tone="error" title={error} />}
      {saved && <Notice tone="success" title="Saved." />}

      <button type="button" className={primaryButton} disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save points settings"}
      </button>
    </div>
  );
}
