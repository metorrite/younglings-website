import type { ReactNode } from "react";
import { primaryButton } from "@/components/admin/ui";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

/**
 * The save button for a whole settings page, kept in view at the bottom of the screen so a long page never needs scrolling back to
 * save. The result of the last save shows beside it.
 */
export function SaveBar({ pending, onSave, outcome, label = "Save changes", children }: { pending: boolean; onSave: () => void; outcome: Outcome; label?: string; children?: ReactNode }) {
  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-surface-border bg-surface/95 p-3 shadow-xl shadow-black/40 backdrop-blur">
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
        ) : (
          <p className="text-muted">{children ?? "Changes apply as soon as you save."}</p>
        )}
      </div>
      <button type="button" className={primaryButton} disabled={pending} onClick={onSave}>
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}
