"use client";

import { useEffect, type ReactNode } from "react";
import { primaryButton } from "@/components/admin/ui";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

/**
 * The save button for a whole settings page, kept in view at the bottom of the screen so a long page never needs scrolling back to
 * save. The result of the last save shows beside it. Given `dirty`, it also says when there are unsaved changes, offers to throw them
 * away, and makes the browser ask before the page is closed or left, so work is never lost by accident.
 */
export function SaveBar({
  pending,
  onSave,
  outcome,
  label = "Save changes",
  dirty = false,
  onDiscard,
  inline = false,
  children,
}: {
  pending: boolean;
  onSave: () => void;
  outcome: Outcome;
  label?: string;
  dirty?: boolean;
  onDiscard?: () => void;
  /** A panel that sits where it is put (under a preview, say) instead of a bar stuck to the bottom of the screen. */
  inline?: boolean;
  children?: ReactNode;
}) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <div
      className={`${inline ? "" : "sticky bottom-4 z-10 "}flex flex-wrap items-center gap-3 rounded-xl border bg-surface/95 p-3 shadow-xl shadow-black/40 backdrop-blur transition-colors ${dirty ? "border-gold/60" : "border-surface-border"}`}
    >
      <div className="min-w-0 flex-1 text-sm">
        {outcome ? (
          <div role={outcome.tone === "error" ? "alert" : "status"} className={outcome.tone === "error" ? "text-red-300" : "text-emerald-300"}>
            <p className="font-medium">{outcome.title}</p>
            {outcome.items && outcome.items.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                {outcome.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ) : dirty ? (
          <p className="font-medium text-gold">You have unsaved changes.</p>
        ) : (
          <p className="text-muted">{children ?? "Everything is saved."}</p>
        )}
      </div>
      {dirty && onDiscard && (
        <button type="button" onClick={onDiscard} disabled={pending} className="rounded-md border border-surface-border px-3 py-2 text-sm text-muted transition hover:text-foreground disabled:opacity-50">
          Discard
        </button>
      )}
      <button type="button" className={primaryButton} disabled={pending || (onDiscard !== undefined && !dirty)} onClick={onSave}>
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}
