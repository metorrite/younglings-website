"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export interface SearchItem {
  label: string;
  href: string;
  hint?: string;
}

/**
 * Search that lives in the navigation bar: click it (or press Ctrl/⌘ K) and the box widens in place with the
 * results listed right underneath; click anywhere else, press Escape or pick a result and it shrinks back.
 */
export function NavSearch({ items }: { items: SearchItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q === "" ? items.filter((i) => i.hint === "Page") : items.filter((i) => i.label.toLowerCase().includes(q));
    // Names that start with the query come before names that merely contain it.
    return [...matches].sort((a, b) => Number(b.label.toLowerCase().startsWith(q)) - Number(a.label.toLowerCase().startsWith(q))).slice(0, 8);
  }, [items, query]);

  function close() {
    setOpen(false);
    setQuery("");
    setCursor(0);
    input.current?.blur();
  }

  function go(item: SearchItem | undefined) {
    if (!item) return;
    close();
    router.push(item.href);
  }

  return (
    <div
      ref={root}
      className={`relative transition-[width] duration-300 ease-out ${open ? "w-64 sm:w-80" : "w-9 sm:w-40"}`}
      onBlur={(e) => {
        // Only shrink when focus has left the whole search area, not when it moves onto a result.
        if (!root.current?.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
          setQuery("");
          setCursor(0);
        }
      }}
    >
      <div className={`flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1.5 text-sm transition ${open ? "border-gold/60" : "border-surface-border hover:border-gold/40"}`} onClick={() => input.current?.focus()}>
        <span aria-hidden className="text-muted">⌕</span>
        <input
          ref={input}
          value={query}
          onFocus={() => setOpen(true)}
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
            } else if (e.key === "Escape") {
              close();
            }
          }}
          placeholder={open ? "Find a member or page…" : "Search"}
          aria-label="Search the site"
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted"
        />
        {!open && <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-muted xl:inline">Ctrl K</kbd>}
      </div>

      {open && (
        <div className="nav-pop absolute top-full right-0 z-50 mt-2 w-full min-w-64 overflow-hidden rounded-xl border border-surface-border bg-surface shadow-2xl">
          <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
            {results.map((item, i) => (
              <li key={item.href} role="option" aria-selected={i === cursor}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // keep focus in the box so the list doesn't vanish before the click lands
                  onClick={() => go(item)}
                  onMouseEnter={() => setCursor(i)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${i === cursor ? "bg-gold/15 text-gold" : ""}`}
                >
                  <span className="truncate">{item.label}</span>
                  {item.hint && <span className="shrink-0 text-xs text-muted">{item.hint}</span>}
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-4 py-5 text-center text-sm text-muted">Nothing matches “{query}”.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
