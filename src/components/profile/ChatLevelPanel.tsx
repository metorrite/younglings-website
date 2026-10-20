import type { MyChatLevel } from "@/lib/member";

/** A member's own chat level: level, how far to the next, rank and messages. Read-only; the server's admins set the rules on the dashboard. */
export function ChatLevelPanel({ level }: { level: MyChatLevel }) {
  if (!level.enabled) {
    return <p className="rounded-lg border border-dashed border-surface-border p-4 text-sm text-muted">Chat levels aren&apos;t switched on in this server. An admin can turn them on from the dashboard.</p>;
  }
  const share = level.maxed || level.toNext === 0 ? 100 : Math.min(100, Math.round((level.intoLevel / level.toNext) * 100));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <p className="text-4xl font-semibold tabular-nums text-gold">Level {level.level}</p>
        <p className="text-sm text-muted">{level.rank ? `Rank #${level.rank} of ${level.members}` : "Not ranked yet. Chat to earn XP."}</p>
      </div>
      <div>
        <div className="h-3 w-full max-w-md overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Progress to the next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={share}>
          <div className="h-full rounded-full bg-gold" style={{ width: `${share}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted">{level.maxed ? "Top level reached." : `${level.intoLevel.toLocaleString()} / ${level.toNext.toLocaleString()} XP to level ${level.level + 1}`}</p>
      </div>
      <p className="text-xs text-muted">
        {level.xp.toLocaleString()} XP in total from {level.messages.toLocaleString()} messages that earned XP. Chat levels are separate from clan points.
      </p>
    </div>
  );
}
