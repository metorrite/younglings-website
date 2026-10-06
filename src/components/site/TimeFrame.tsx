"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { PERIOD_PRESETS } from "@/lib/site";

/**
 * The time-frame picker used across the stats pages: preset windows (this week, month to date, year to date…)
 * and a custom date range. The choice lives in the URL (`?period=`), so any view can be linked to or bookmarked,
 * and every other query parameter on the page (a boss filter, say) is left alone.
 */
export function TimeFrame({ current, label, fallback = "all", presets = PERIOD_PRESETS, param = "period" }: { current: string; label: string; fallback?: string; presets?: { token: string; label: string }[]; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const isPreset = presets.some((p) => p.token === current);
  const [custom, setCustom] = useState(!isPreset);
  const range = /^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/.exec(current);
  const [from, setFrom] = useState(range?.[1] ?? "");
  const [to, setTo] = useState(range?.[2] ?? "");

  function go(token: string) {
    const next = new URLSearchParams(search.toString());
    if (token === fallback) next.delete(param);
    else next.set(param, token);
    const query = next.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  const valid = from !== "" && to !== "" && from <= to;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className={`space-y-2 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Time frame">
        {presets.map((p) => (
          <button
            key={p.token}
            type="button"
            onClick={() => {
              setCustom(false);
              go(p.token);
            }}
            aria-pressed={current === p.token}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors duration-200 ${current === p.token ? "border-gold bg-gold text-background" : "border-surface-border hover:border-gold/50"}`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom((c) => !c)}
          aria-pressed={custom}
          className={`rounded-md border px-3 py-1.5 text-sm transition-colors duration-200 ${custom && !isPreset ? "border-gold bg-gold text-background" : custom ? "border-gold/60" : "border-surface-border hover:border-gold/50"}`}
        >
          Custom…
        </button>
        <span className="ml-1 text-xs text-muted">Showing: {label}</span>
      </div>

      {custom && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-lg border border-surface-border/70 bg-background/40 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) go(`${from}_${to}`);
          }}
        >
          <label className="text-xs text-muted">
            From
            <input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-md border border-surface-border bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>
          <label className="text-xs text-muted">
            To
            <input type="date" value={to} min={from || undefined} max={today} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-md border border-surface-border bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>
          <button type="submit" disabled={!valid} className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-background disabled:opacity-40">
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
