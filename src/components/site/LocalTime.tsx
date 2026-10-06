"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/**
 * A moment shown in the *viewer's* timezone. The server can't know it, so it renders UTC; once the page is in
 * the browser, React swaps in the same moment on the reader's own clock (no flash of wrong content — the
 * hydration pass uses the server's text, then re-renders with the local one).
 */
export function LocalTime({ iso, mode = "datetime" }: { iso: string; mode?: "datetime" | "relative" | "clock" }) {
  const utc =
    mode === "clock"
      ? new Date(iso).toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })
      : new Date(iso).toLocaleString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " UTC";
  const text = useSyncExternalStore(
    noSubscription,
    () => (mode === "relative" ? relative(new Date(iso)) : mode === "clock" ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : local(new Date(iso))),
    () => (mode === "relative" ? "" : utc),
  );

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text || utc}
    </time>
  );
}

function local(date: Date): string {
  return date.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

function relative(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const span = minutes < 60 ? `${minutes} min` : hours < 48 ? `${hours} hr` : `${days} days`;
  return diffMs >= 0 ? `in ${span}` : `${span} ago`;
}
