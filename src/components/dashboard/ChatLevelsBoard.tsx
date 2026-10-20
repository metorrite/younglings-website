"use client";

import { useState, useTransition } from "react";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import type { ChatLevelTop, WelcomeActionResult } from "@/lib/jonnybot-admin";

const small = "rounded-full border border-surface-border px-3 py-1 text-xs text-muted transition hover:text-foreground disabled:opacity-40";

/** The chat leaderboard with the staff actions that go with it: set one member's XP back to nothing, or everyone's. Both ask first. */
export function ChatLevelsBoard({ initial, reset }: { initial: ChatLevelTop; reset: (target: { userId?: string; all?: boolean }) => Promise<WelcomeActionResult<ChatLevelTop>> }) {
  const [board, setBoard] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(target: { userId?: string; all?: boolean }, question: string) {
    if (!window.confirm(question)) return;
    setError(null);
    start(async () => {
      const result = await reset(target);
      if (!result.ok) return setError(result.error);
      setBoard(result.data);
    });
  }

  return (
    <CollapsibleCard
      id="levels-board"
      title="Leaderboard"
      hint="The most active chatters."
      defaultOpen
      summary={<Chip>{board.members} member{board.members === 1 ? "" : "s"} with XP</Chip>}
      info="The top 20. Resetting sets a member's XP back to nothing; their level roles are left as they are."
    >
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {board.top.length === 0 ? (
        <p className="text-sm text-muted">Nobody has earned XP yet. Switch chat levels on and chat a little.</p>
      ) : (
        <ol className="space-y-1">
          {board.top.map((row) => (
            <li key={row.userId} className="flex flex-wrap items-center gap-3 rounded-md border border-surface-border/60 px-3 py-1.5 text-sm">
              <span className="w-6 text-right tabular-nums text-muted">{row.rank}</span>
              <span className="min-w-32 flex-1 font-medium">{row.name}</span>
              <span className="tabular-nums">level {row.level}</span>
              <span className="w-24 text-right tabular-nums text-muted">{row.xp.toLocaleString()} XP</span>
              <button type="button" className={small} disabled={pending} onClick={() => run({ userId: row.userId }, `Set ${row.name}'s XP back to nothing?`)} aria-label={`Reset ${row.name}'s XP`}>
                Reset
              </button>
            </li>
          ))}
        </ol>
      )}
      {board.members > 0 && (
        <button type="button" className={small} disabled={pending} onClick={() => run({ all: true }, "Set everyone's XP back to nothing? This can't be undone.")}>
          Reset everyone&apos;s XP
        </button>
      )}
    </CollapsibleCard>
  );
}
