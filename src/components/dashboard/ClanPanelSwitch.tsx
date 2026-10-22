"use client";

import { useState, useTransition } from "react";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";

export type ClanPanelSave = (next: boolean) => Promise<{ ok: true; data: { clanPanel: boolean } } | { ok: false; error: string }>;

/**
 * "Allow the in-game clan panel" on the Clan plugin page (T-206): when on, RuneSync can show this server's members the clan's open and
 * running events, their own points and their own progress inside the game. Off until staff turn it on; saved as soon as it is switched.
 */
export function ClanPanelSwitch({ initial, save }: { initial: boolean; save: ClanPanelSave }) {
  const [on, setOn] = useState(initial);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function change(next: boolean) {
    setNote(null);
    start(async () => {
      const result = await save(next);
      if (!result.ok) return setNote({ tone: "error", text: result.error });
      setOn(result.data.clanPanel);
      setNote({
        tone: "ok",
        text: result.data.clanPanel ? "On. Members see it in RuneSync within about 10 minutes." : "Off. RuneSync stops showing the panel within about 10 minutes.",
      });
    });
  }

  return (
    <div className="space-y-3">
      <SettingRow
        title="Allow the in-game clan panel"
        hint="Members who use RuneSync can open a small panel in the game with this server's open and running events (times in their own time zone), their own points, and their own progress in the events they are in. Each member also switches it on in RuneSync."
        info="Only what a member can already see on the website is shown, and only their own points and progress. Nobody else is named. Off by default."
        checked={on}
        onChange={change}
        disabled={pending}
      />
      {note && (
        <p role={note.tone === "error" ? "alert" : "status"} className={`text-sm ${note.tone === "error" ? "text-red-300" : "text-emerald-300"}`}>
          {note.text}
        </p>
      )}
    </div>
  );
}
