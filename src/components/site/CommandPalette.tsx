"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export interface PaletteItem {
  label: string;
  href: string;
  hint?: string;
}

/**
 * Ctrl+K (or ⌘K, or the search button) opens a box to jump to any page or member. The list of members arrives
 * from the server already fetched; everything else happens in the browser.
 */
export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q === "" ? items.filter((i) => i.hint === "Page") : items.filter((i) => i.label.toLowerCase().includes(q));
    // Names that start with the query come before names that merely contain it.
    return matches.sort((a, b) => Number(b.label.toLowerCase().startsWith(q)) - Number(a.label.toLowerCase().startsWith(q))).slice(0, 12);
  }, [items, query]);

  function go(item: PaletteItem | undefined) {
    if (!item) return;
    setOpen(false);
    setQuery("");
    setCursor(0);
    router.push(item.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-md border border-surface-border px-2.5 py-1.5 text-xs text-muted transition hover:text-foreground sm:flex"
        aria-label="Search"
      >
        Search
        <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[15vh] backdrop-blur-sm" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Search">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-surface-border bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <input
              ref={input}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setCursor((c) => Math.min(c + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setCursor((c) => Math.max(c - 1, 0));
                } else if (e.key === "Enter") {
                  go(results[cursor]);
                }
              }}
              placeholder="Jump to a member or page…"
              className="w-full border-b border-surface-border bg-transparent px-4 py-3 text-sm outline-none"
            />
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((item, i) => (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={() => go(item)}
                    onMouseEnter={() => setCursor(i)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${i === cursor ? "bg-gold/15 text-gold" : ""}`}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.hint && <span className="shrink-0 text-xs text-muted">{item.hint}</span>}
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Nothing matches “{query}”.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
