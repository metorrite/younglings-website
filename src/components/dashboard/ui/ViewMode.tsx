"use client";

import { useSyncExternalStore } from "react";

export type ViewMode = "basic" | "advanced";

const KEY = "jonnybot-dashboard-view:";
const EVENT = "jonnybot-dashboard-view-changed";

function subscribe(notify: () => void) {
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

// what could not be stored (a private window): kept for the life of the page so the switch still works
const memory = new Map<string, ViewMode>();

function read(id: string): ViewMode {
  try {
    const saved = window.localStorage.getItem(KEY + id);
    if (saved === "advanced" || saved === "basic") return saved;
  } catch {
    // fall through to the page's own memory
  }
  return memory.get(id) ?? "basic";
}

/**
 * Whether a panel or page shows its basic controls (the few most people need) or everything. Basic until someone chooses otherwise, and the choice is remembered
 * in this browser, per `id`. Use one `id` per panel or page, like "event-channels".
 */
export function useViewMode(id: string): [ViewMode, (next: ViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, () => read(id), () => "basic" as ViewMode);
  const set = (next: ViewMode) => {
    memory.set(id, next);
    try {
      window.localStorage.setItem(KEY + id, next);
    } catch {
      // not remembered across visits
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [mode, set];
}

/** The Basic / Advanced switch, a small two-part button for the corner of a panel. */
export function ViewModeSwitch({ mode, onChange, label = "View" }: { mode: ViewMode; onChange: (next: ViewMode) => void; label?: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-1 rounded-md border border-surface-border p-0.5 text-xs">
      {(["basic", "advanced"] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
          className={`rounded px-2.5 py-1 font-medium capitalize transition ${mode === m ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground"}`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
