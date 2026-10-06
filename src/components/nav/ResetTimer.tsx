"use client";

import { useSyncExternalStore } from "react";

const DAY = 86_400_000;

/** The next RuneScape weekly reset (Wednesday 00:00 UTC — also when the Citadel week turns over) after `now`. */
export function nextWeeklyReset(now: number): number {
  const d = new Date(now);
  const daysUntilWednesday = (3 - d.getUTCDay() + 7) % 7;
  let target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysUntilWednesday);
  if (target <= now) target += 7 * DAY;
  return target;
}

/** The next daily reset (00:00 UTC) after `now`. */
export function nextDailyReset(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${days > 0 ? `${days}d ` : ""}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// One shared clock: it ticks once a second while anything is subscribed, and the server renders a placeholder.
const subscribe = (notify: () => void) => {
  const id = window.setInterval(notify, 1000);
  return () => window.clearInterval(id);
};
const snapshot = () => Math.floor(Date.now() / 1000);

/** A live countdown to the weekly game reset (Citadel and weekly activities), with the daily reset on hover. */
export function ResetTimer() {
  const seconds = useSyncExternalStore(subscribe, snapshot, () => null);
  const now = seconds === null ? null : seconds * 1000;

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-surface-border bg-background/60 px-3 py-1.5 text-xs"
      title={now === null ? "Weekly game reset" : `Weekly game reset — Wednesday 00:00 UTC (the Citadel week turns over too). Daily reset in ${formatCountdown(nextDailyReset(now) - now)}.`}
    >
      <span aria-hidden>⏳</span>
      <span className="hidden text-muted sm:inline">Weekly reset</span>
      <span className="font-mono font-semibold text-gold tabular-nums" suppressHydrationWarning>
        {now === null ? "—" : formatCountdown(nextWeeklyReset(now) - now)}
      </span>
    </div>
  );
}
