"use client";

import type { ReactNode } from "react";
import { dangerButton, ghostButton, inputClass } from "@/components/admin/ui";
import type { EventPrize } from "@/lib/eventTypes";

export const emptyPrize = (): EventPrize => ({ id: "", place: 1, placeTo: 1, kind: "IN_GAME", description: "", amount: 0, percentOfPot: 0, split: "EQUAL" });

const num = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(/[, ]/g, "")) || 0);

/** One labelled field of a prize. `className` gives its width: the row wraps when the room runs out, and no field is stretched past what goes in it. */
function Cell({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block text-xs font-medium text-muted ${className ?? ""}`}>
      {label}
      <span className="mt-1 block text-sm font-normal text-foreground">{children}</span>
    </label>
  );
}

/**
 * The list of prizes an event gives out, one row each: the places it goes to, what it is, how much, and how a team shares it. Used by the event's prizes tab and
 * by the setup screens, so a prize is the same thing in both. {@code lockPlaces} stops the first place being changed (once payouts exist).
 */
export function PrizeListEditor({ prizes, onChange, lockPlaces = false, disabled = false }: { prizes: EventPrize[]; onChange: (next: EventPrize[]) => void; lockPlaces?: boolean; disabled?: boolean }) {
  const change = (i: number, patch: Partial<EventPrize>) => onChange(prizes.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="@container space-y-3">
      <ul className="space-y-3">
        {prizes.length === 0 && (
          <li className="rounded-xl border border-dashed border-surface-border p-5 text-center text-sm text-muted">
            <p className="font-medium text-foreground">No prizes yet</p>
            <p className="mt-1">Add one if there is something for the winners.</p>
          </li>
        )}
        {prizes.map((p, i) => (
          <li key={i} className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl border border-surface-border bg-surface p-4">
            <Cell label="From place" className="w-24">
              <input
                className={inputClass}
                disabled={disabled || lockPlaces}
                inputMode="numeric"
                title="First place"
                value={p.place}
                onChange={(ev) => change(i, { place: num(ev.target.value), placeTo: Math.max(p.placeTo, num(ev.target.value)) })}
              />
            </Cell>
            <Cell label="To place" className="w-24">
              <input className={inputClass} disabled={disabled} inputMode="numeric" title="Last place" value={p.placeTo} onChange={(ev) => change(i, { placeTo: num(ev.target.value) })} />
            </Cell>
            <Cell label="Kind" className="w-40">
              <select className={inputClass} disabled={disabled} value={p.kind} onChange={(ev) => change(i, { kind: ev.target.value as EventPrize["kind"] })}>
                <option value="IN_GAME">In game</option>
                <option value="CLAN_POINTS">Clan points</option>
                <option value="OTHER">Other</option>
              </select>
            </Cell>
            <Cell label="What it is" className="w-full sm:w-72">
              <input className={inputClass} disabled={disabled} placeholder="e.g. Zaros godsword" value={p.description} onChange={(ev) => change(i, { description: ev.target.value })} />
            </Cell>
            <Cell label="Fixed amount" className="w-36">
              <input className={inputClass} disabled={disabled} inputMode="numeric" title="Fixed amount (points or gp)" placeholder="Amount" value={p.amount} onChange={(ev) => change(i, { amount: num(ev.target.value) })} />
            </Cell>
            <Cell label="% of the pot" className="w-28">
              <input
                className={inputClass}
                disabled={disabled}
                inputMode="decimal"
                title="Share of the pot, in percent"
                placeholder="% of pot"
                value={p.percentOfPot / 100}
                onChange={(ev) => change(i, { percentOfPot: Math.round(Number(ev.target.value || 0) * 100) })}
              />
            </Cell>
            <Cell label="Team share" className="w-48">
              <select className={inputClass} disabled={disabled} value={p.split} onChange={(ev) => change(i, { split: ev.target.value as EventPrize["split"] })}>
                <option value="EQUAL">Split equally</option>
                <option value="EACH">Each member gets it</option>
                <option value="CAPTAIN">Captain gets it</option>
              </select>
            </Cell>
            <button type="button" className={`${dangerButton} ml-auto`} disabled={disabled} onClick={() => onChange(prizes.filter((_, j) => j !== i))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className={ghostButton} disabled={disabled} onClick={() => onChange([...prizes, { ...emptyPrize(), place: prizes.length + 1, placeTo: prizes.length + 1 }])}>
        + Add a prize
      </button>
    </div>
  );
}
