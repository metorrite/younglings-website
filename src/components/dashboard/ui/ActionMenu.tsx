"use client";

import { useEffect, useRef, useState } from "react";

export type ActionMenuItem = { label: string; onSelect: () => void; tone?: "default" | "danger"; hint?: string };

/**
 * A "more actions" button for a row: one small button that opens a short list, so a row shows its one main action and keeps the rest (rare or risky ones) out
 * of the way instead of a line of tiny underlined links. Opens with a click, Enter or Space; arrow keys move; Escape or a click elsewhere closes it and gives
 * the focus back to the button.
 */
export function ActionMenu({ label, items, disabled }: { label: string; items: ActionMenuItem[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (items.length === 0) return null;

  function keys(e: React.KeyboardEvent) {
    const entries = [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const at = entries.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      entries[(at + 1) % entries.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      entries[(at - 1 + entries.length) % entries.length]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={root} className="relative" onKeyDown={open ? keys : undefined}>
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-md border border-control-border text-lg leading-none text-muted transition hover:border-gold hover:text-foreground disabled:opacity-50"
      >
        <span aria-hidden>⋯</span>
      </button>
      {open && (
        <div role="menu" aria-label={label} className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-control-border bg-surface p-1 shadow-xl shadow-black/50">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                button.current?.focus();
                item.onSelect();
              }}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-white/5 focus-visible:bg-white/5 ${item.tone === "danger" ? "text-red-300" : "text-foreground"}`}
            >
              {item.label}
              {item.hint && <span className="block text-xs text-muted">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
