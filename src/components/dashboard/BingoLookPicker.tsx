"use client";

/* eslint-disable @next/next/no-img-element -- fixed preview pictures from /public/bingo-looks; next/image would only re-encode them */

import { BINGO_LOOKS, PLAIN_LOOK } from "@/lib/eventTypes";

/**
 * Pick what a bingo board is drawn on, by picture: each card shows the board of the chosen shape in that look. {@code shape} is a shape id or "grid";
 * {@code allowPlain} adds the original flat board a square grid had before looks existed (an event made earlier may still be using it).
 */
export function BingoLookPicker({ shape, value, onChange, allowPlain = false, disabled = false }: { shape: string; value: string | null; onChange: (id: string) => void; allowPlain?: boolean; disabled?: boolean }) {
  const looks = allowPlain && shape === "grid" ? [...BINGO_LOOKS, PLAIN_LOOK] : BINGO_LOOKS;
  return (
    <div role="radiogroup" aria-label="Board look" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {looks.map((look) => {
        const selected = value === look.id;
        return (
          <button
            key={look.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(look.id)}
            className={`overflow-hidden rounded-lg border bg-surface text-left transition disabled:opacity-60 ${selected ? "border-gold ring-2 ring-gold/60" : "border-surface-border hover:border-gold/60"}`}
          >
            <img src={`/bingo-looks/${shape}-${look.id}.jpg`} alt={`The ${look.label} look`} width={640} height={400} loading="lazy" className="block aspect-[8/5] w-full object-cover" />
            <span className="block space-y-0.5 p-2.5">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span aria-hidden className={`inline-block size-3 rounded-full border ${selected ? "border-gold bg-gold" : "border-muted"}`} />
                {look.label}
              </span>
              <span className="block text-xs text-muted">{look.blurb}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
