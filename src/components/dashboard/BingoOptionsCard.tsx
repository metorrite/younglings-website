"use client";

import { useState } from "react";
import { inputClass, primaryButton } from "@/components/admin/ui";
import type { EventDetail } from "@/lib/eventTypes";

type BoardOptions = NonNullable<EventDetail["event"]["config"]["board"]>;
type Patch = Partial<Pick<BoardOptions, "title" | "subtitle" | "fog" | "names" | "numbers" | "accent" | "curve" | "freeCentre">>;

const ACCENTS: [string, string, string][] = [
  ["gold", "Gold", "#d4af37"],
  ["emerald", "Emerald", "#3fbf7f"],
  ["azure", "Azure", "#4da3ff"],
  ["crimson", "Crimson", "#e5566d"],
  ["violet", "Violet", "#a77bf0"],
];
const CURVES: [string, string][] = [
  ["pool", "As the pool values them (rarer is worth more)"],
  ["flat", "Every tile worth the same"],
  ["ramp", "Rising along the board, cheapest first"],
];

/**
 * The extra options of a bingo board, shown on the event's Board tab: what the picture says and shows (title, subtitle, fog of war, names, numbers, accent
 * colour) can change any time before the event is over; how points are spread and the free centre apply the next time the board is made or re-rolled, so they
 * are only offered while tiles can still change ({@code canReroll}). Everything is optional and off or as before by default; {@code shaped} boards have a
 * printed title and no accent, so only the options that apply to them are shown.
 */
export function BingoOptionsCard({ board, shaped, canReroll, disabled, save }: { board: Partial<BoardOptions>; shaped: boolean; canReroll: boolean; disabled: boolean; save: (patch: Patch) => void }) {
  const [draft, setDraft] = useState<Patch>({
    title: board.title ?? "",
    subtitle: board.subtitle ?? "",
    fog: board.fog ?? false,
    names: board.names ?? false,
    numbers: board.numbers ?? true,
    accent: board.accent ?? "gold",
    curve: board.curve ?? "pool",
    freeCentre: board.freeCentre ?? false,
  });
  const set = (patch: Patch) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = JSON.stringify(draft) !== JSON.stringify({ title: board.title ?? "", subtitle: board.subtitle ?? "", fog: board.fog ?? false, names: board.names ?? false, numbers: board.numbers ?? true, accent: board.accent ?? "gold", curve: board.curve ?? "pool", freeCentre: board.freeCentre ?? false });
  const check = (label: string, hint: string, value: boolean | undefined, onChange: (on: boolean) => void) => (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" className="mt-1" checked={value === true} disabled={disabled} onChange={(ev) => onChange(ev.target.checked)} />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
  return (
    <div className="space-y-4 rounded-xl border border-surface-border p-4">
      <div>
        <p className="text-sm font-medium">Board options</p>
        <p className="text-xs text-muted">All optional. A board with none of these set is drawn exactly as before. Press Post or refresh the boards after saving to update Discord.</p>
      </div>
      {!shaped && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Board title</span>
            <input className={inputClass} value={draft.title} maxLength={60} placeholder="The event's name" disabled={disabled} onChange={(ev) => set({ title: ev.target.value })} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Board subtitle</span>
            <input className={inputClass} value={draft.subtitle} maxLength={90} placeholder="The usual line" disabled={disabled} onChange={(ev) => set({ subtitle: ev.target.value })} />
          </label>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {shaped && check("Fog of war", "A tile that is still closed shows no name, picture or points, only its number. Only matters when tiles open in order.", draft.fog, (on) => set({ fog: on }))}
        {!shaped && check("Names under finished tiles", "Who finished a tile first, on the shared board.", draft.names, (on) => set({ names: on }))}
        {!shaped && check("Tile numbers", "The number in the corner of each tile (what players type to send proof).", draft.numbers, (on) => set({ numbers: on }))}
      </div>
      {!shaped && (
        <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Accent colour</span>
          {ACCENTS.map(([id, label, colour]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={draft.accent === id}
              aria-label={label}
              title={label}
              disabled={disabled}
              onClick={() => set({ accent: id })}
              className={`size-7 rounded-full border-2 transition ${draft.accent === id ? "border-foreground" : "border-transparent hover:border-muted"}`}
              style={{ backgroundColor: colour }}
            />
          ))}
        </div>
      )}
      {canReroll && (
        <div className="space-y-3 border-t border-surface-border pt-3">
          <p className="text-xs text-muted">These apply the next time the board is made or re-rolled (locked tiles keep their points).</p>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Points of the tiles</span>
            <select className={inputClass} value={draft.curve} disabled={disabled} onChange={(ev) => set({ curve: ev.target.value })}>
              {CURVES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {!shaped && check("Free centre", "The middle tile of an odd grid (3x3, 5x5, 7x7) is a free space: done for everyone, and it counts towards every line through it and the blackout.", draft.freeCentre, (on) => set({ freeCentre: on }))}
        </div>
      )}
      <button type="button" className={primaryButton} disabled={disabled || !dirty} onClick={() => save(draft)}>
        Save board options
      </button>
    </div>
  );
}
