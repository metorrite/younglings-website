"use client";

import { useState, useTransition } from "react";
import { savePluginVisibilityAction } from "@/app/profile/pluginActions";

/**
 * "Show my clan that I use RuneSync" (T-140): the member's own switch, off by default. When on, the staff of each clan they are on the roster
 * of see their RuneScape name, the day RuneSync last checked in and its version on the dashboard's Clan plugin page. When off they are only
 * part of the counts there.
 */
export function ShowToClanSwitch({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function change(next: boolean) {
    setNote(null);
    start(async () => {
      const result = await savePluginVisibilityAction(next);
      if (!result.ok) return setNote({ tone: "error", text: result.error });
      setOn(result.data.showToClan);
      setNote({
        tone: "ok",
        text: result.data.showToClan ? "On. Your clan's staff can see that you use RuneSync." : "Off. Your clan's staff only see you in the counts.",
      });
    });
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-surface-border/60 bg-background/40 px-4 py-3">
        <span>
          <span className="block text-sm font-medium">Show my clan that I use RuneSync</span>
          <span className="mt-0.5 block text-xs text-muted">
            Clan staff see your RuneScape name, the day RuneSync last checked in and its version on their dashboard, so they know whose bingo tiles
            tick themselves. Nothing you did in the game is shown there. Off until you switch it on.
          </span>
        </span>
        <span className="relative mt-0.5 shrink-0">
          <input type="checkbox" className="peer sr-only" checked={on} disabled={pending} onChange={(e) => change(e.target.checked)} />
          <span className="block h-6 w-11 rounded-full bg-white/15 transition peer-checked:bg-gold peer-focus-visible:ring-2 peer-focus-visible:ring-gold/60" />
          <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
        </span>
      </label>
      {note && (
        <p role={note.tone === "error" ? "alert" : "status"} className={`text-sm ${note.tone === "error" ? "text-red-300" : "text-emerald-300"}`}>
          {note.text}
        </p>
      )}
    </div>
  );
}
