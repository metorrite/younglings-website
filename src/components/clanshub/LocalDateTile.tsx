"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/** A small calendar tile (month over day) in the viewer's own timezone; the server renders UTC and the browser swaps in the local date. */
export function LocalDateTile({ iso, accent }: { iso: string; accent: string }) {
  const date = new Date(iso);
  const utc = { month: date.toLocaleString("en-GB", { timeZone: "UTC", month: "short" }), day: String(date.getUTCDate()) };
  const local = useSyncExternalStore(
    noSubscription,
    () => JSON.stringify({ month: date.toLocaleString("en-GB", { month: "short" }), day: String(date.getDate()) }),
    () => JSON.stringify(utc),
  );
  const { month, day } = JSON.parse(local) as { month: string; day: string };
  return (
    <span aria-hidden className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border text-center leading-none" style={{ borderColor: `${accent}66`, backgroundColor: `${accent}1f` }}>
      <span className="text-[0.65rem] font-semibold tracking-widest uppercase" style={{ color: accent }}>
        {month}
      </span>
      <span className="mt-1 text-xl font-semibold tabular-nums">{day}</span>
    </span>
  );
}
