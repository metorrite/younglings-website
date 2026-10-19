"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/**
 * Basic or Advanced: one choice for the whole dashboard, made with the slider under the server icon at the top of the sidebar. Basic is what most servers
 * need; Advanced adds the options that are rarely changed. A page or panel asks `useViewMode()` (or wraps the rare options in `<Advanced>`), it never
 * carries a switch of its own.
 */
export type ViewMode = "basic" | "advanced";

const KEY = "jonnybot-dashboard-view";
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
let memory: ViewMode = "basic";

function read(): ViewMode {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "advanced" || saved === "basic") return saved;
  } catch {
    // fall through to the page's own memory
  }
  return memory;
}

/**
 * The dashboard's view: Basic until someone chooses otherwise, remembered in this browser. Every page and panel reads the same one, so the slider in the
 * sidebar changes them all at once.
 * <p>
 * `id` is no longer used (the view used to be kept per panel); it is accepted so older callers still compile.
 */
export function useViewMode(id?: string): [ViewMode, (next: ViewMode) => void] {
  void id;
  const mode = useSyncExternalStore(subscribe, read, () => "basic" as ViewMode);
  const set = (next: ViewMode) => {
    memory = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // not remembered across visits
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [mode, set];
}

/** What is inside only shows in the Advanced view. */
export function Advanced({ children }: { children: ReactNode }) {
  const [mode] = useViewMode();
  return mode === "advanced" ? <>{children}</> : null;
}

/**
 * A quiet line for a page whose Advanced view has more on it: it says what is there and has a button that switches to it. Nothing shows in the Advanced view,
 * where there is nothing left to point at.
 */
export function MoreInAdvanced({ children }: { children: ReactNode }) {
  const [mode, setMode] = useViewMode();
  if (mode === "advanced") return null;
  return (
    <p className="text-xs text-muted">
      More in the Advanced view: {children}{" "}
      <button type="button" className="text-gold underline" onClick={() => setMode("advanced")}>
        Show it
      </button>
    </p>
  );
}

/**
 * The slider that sets the view for the whole dashboard: Basic on the left, Advanced on the right, a gold thumb that slides to the one in use. It sits in the
 * sidebar, under the server icon, so it is the same on every page.
 */
export function ViewModeSlider({ onChange }: { onChange?: (next: ViewMode) => void } = {}) {
  const [mode, setMode] = useViewMode();
  const advanced = mode === "advanced";
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={advanced}
        aria-label="Advanced view for the whole dashboard"
        title={advanced ? "Advanced: every option. Click for Basic." : "Basic: what most servers need. Click for Advanced."}
        onClick={() => {
          const next = advanced ? "basic" : "advanced";
          setMode(next);
          onChange?.(next);
        }}
        className="relative grid w-full grid-cols-2 rounded-full border border-surface-border bg-background/60 p-0.5 text-xs font-medium"
      >
        <span aria-hidden className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-gold/20 ring-1 ring-gold/60 transition-transform duration-200 ${advanced ? "translate-x-full" : ""}`} />
        <span className={`relative z-10 py-1.5 text-center transition-colors ${advanced ? "text-muted" : "text-gold"}`}>Basic</span>
        <span className={`relative z-10 py-1.5 text-center transition-colors ${advanced ? "text-gold" : "text-muted"}`}>Advanced</span>
      </button>
      <p className="mt-1.5 text-[11px] leading-snug text-muted">{advanced ? "Every option on every page." : "Just what most servers need."}</p>
    </div>
  );
}
