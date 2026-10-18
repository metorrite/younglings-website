"use client";

import { useEffect, useState, type ReactNode } from "react";
import { InfoBubble } from "./InfoBubble";

const KEY = "jonnybot-dashboard-open:";

/**
 * A settings section that opens and closes with a click, like a command's card on the Commands page. Closed, it still says what is in
 * it (`summary`: a few short chips, such as the channel chosen or "Not set"), so a page of them reads like a checklist and each one
 * opens only when there is something to change. What is inside stays on the page while closed, so edits that haven't been saved are
 * never lost by folding a section away. Whether it is open is remembered in this browser, per `id`.
 * <p>
 * Give it `open` and `onOpenChange` and the page decides instead (a button elsewhere that leads into the panel); it is then not remembered.
 */
export function CollapsibleCard({
  id,
  title,
  hint,
  info,
  summary,
  defaultOpen = false,
  open: controlled,
  onOpenChange,
  children,
}: {
  id: string;
  title: string;
  hint?: ReactNode;
  info?: ReactNode;
  summary?: ReactNode;
  defaultOpen?: boolean;
  /** The page says whether it is open. */
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
  children: ReactNode;
}) {
  const [own, setOpen] = useState(defaultOpen);
  const open = controlled ?? own;

  useEffect(() => {
    if (controlled !== undefined) return;
    try {
      const saved = window.localStorage.getItem(KEY + id);
      if (saved === "1" || saved === "0") setOpen(saved === "1"); // eslint-disable-line react-hooks/set-state-in-effect -- read once after hydration so the server and first paint agree
    } catch {
      // storage can be unavailable (private windows); the section just keeps its default
    }
  }, [id, controlled]);

  const toggle = () => {
    const next = !open;
    onOpenChange?.(next);
    if (controlled !== undefined) return;
    setOpen(next);
    try {
      window.localStorage.setItem(KEY + id, next ? "1" : "0");
    } catch {
      // not remembered, still works
    }
  };

  return (
    <section className="rounded-xl border border-surface-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4 sm:px-6">
        <button type="button" aria-expanded={open} onClick={toggle} className="flex min-w-0 flex-1 basis-60 items-center gap-3 text-left">
          <span aria-hidden="true" className={`text-xs text-muted transition-transform ${open ? "rotate-90" : ""}`}>
            ▶
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-gold">{title}</span>
            {hint && <span className="mt-0.5 block text-sm text-muted">{hint}</span>}
          </span>
        </button>
        {summary && !open && <div className="flex flex-wrap items-center gap-1.5 text-xs">{summary}</div>}
        {info && <InfoBubble title={title}>{info}</InfoBubble>}
      </div>
      <div hidden={!open} className="space-y-4 border-t border-surface-border p-5 sm:p-6">
        {children}
      </div>
    </section>
  );
}

/** A small rounded label for a collapsed section's summary. `tone` colours the ones that say something is on, off or missing. */
export function Chip({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "good" | "warn" | "bad" }) {
  const style = tone === "good" ? "bg-emerald-500/15 text-emerald-300" : tone === "warn" ? "bg-amber-500/15 text-amber-300" : tone === "bad" ? "bg-red-500/15 text-red-300" : "bg-white/10 text-muted";
  return <span className={`rounded-full px-2.5 py-1 font-medium ${style}`}>{children}</span>;
}
