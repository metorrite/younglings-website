"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

/**
 * Pick one or several bosses to narrow a view to. The selection lives in the URL (`?bosses=a,b`), next to the
 * time frame, so the filtered view can be shared. Selected bosses show as removable chips; a search box lists the
 * rest.
 */
export function BossFilter({ options, selected, param = "bosses" }: { options: { key: string; name: string }[]; selected: string[]; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const byKey = useMemo(() => new Map(options.map((o) => [o.key, o.name])), [options]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !selected.includes(o.key) && (q === "" || o.name.toLowerCase().includes(q))).slice(0, 12);
  }, [options, selected, query]);

  function set(keys: string[]) {
    const next = new URLSearchParams(search.toString());
    if (keys.length === 0) next.delete(param);
    else next.set(param, keys.join(","));
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <div className={`space-y-2 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm text-muted">Bosses:</span>
        {selected.length === 0 && <span className="rounded-md border border-gold/60 px-3 py-1 text-sm text-gold">All bosses</span>}
        {selected.map((key) => (
          <button key={key} type="button" onClick={() => set(selected.filter((k) => k !== key))} className="group flex items-center gap-1.5 rounded-md border border-gold bg-gold/15 px-3 py-1 text-sm text-gold" title="Remove this boss">
            {byKey.get(key) ?? key}
            <span aria-hidden className="text-gold/60 group-hover:text-gold">×</span>
          </button>
        ))}
        {selected.length > 0 && (
          <button type="button" onClick={() => set([])} className="text-xs text-muted hover:text-foreground">
            Clear
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Add a boss…"
          aria-label="Add a boss to the filter"
          className="w-full rounded-md border border-surface-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-gold/60"
        />
        {open && matches.length > 0 && (
          <ul className="nav-pop absolute top-full z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-surface-border bg-surface py-1 shadow-xl">
            {matches.map((o) => (
              <li key={o.key}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    set([...selected, o.key]);
                    setQuery("");
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
                >
                  {o.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
