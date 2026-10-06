"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Notification, NotificationKind } from "@/lib/notifications";

const SEEN_KEY = "younglings.bell.seen";
const CHANGED = "younglings:bell-changed";
const DAY = 86_400_000;

const ICON: Record<NotificationKind, string> = { event: "📅", poll: "🗳️", signup: "📝", news: "📣", update: "✨", link: "🔗", goal: "🎯" };

/** When the bell was last opened (ISO), or "" before it ever was; the server render has no way to know, so it reads as "unknown". */
function readSeen(): string {
  try {
    return window.localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Anything newer than this counts as new: the last time the bell was opened, or — for a first visit — the last three days. */
function threshold(seen: string): number {
  return seen ? Date.parse(seen) : Date.now() - 3 * DAY;
}

function ago(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (diff < 0) return "soon";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** The bell between search and the profile: new events, polls, signups, announcements and site updates since you last looked. */
export function NotificationBell({ items }: { items: Notification[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(pathname);
  const [highlightFrom, setHighlightFrom] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  const seen = useSyncExternalStore(
    (notify) => {
      window.addEventListener(CHANGED, notify);
      window.addEventListener("storage", notify);
      return () => {
        window.removeEventListener(CHANGED, notify);
        window.removeEventListener("storage", notify);
      };
    },
    readSeen,
    () => null,
  );
  const unread = seen === null ? 0 : items.filter((i) => Date.parse(i.at) > threshold(seen)).length;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      // Remember what was new at the moment of opening (so it stays highlighted), then count everything as read.
      setHighlightFrom(threshold(readSeen()));
      try {
        window.localStorage.setItem(SEEN_KEY, new Date().toISOString());
      } catch {
        // can't remember; the badge will return next page load
      }
      window.dispatchEvent(new Event(CHANGED));
    }
    setOpen(!open);
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} new` : "Notifications"}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition ${open ? "bg-white/10" : "hover:bg-white/5"}`}
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="nav-pop absolute top-full right-0 z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] pt-2">
          <div className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-2.5">
              <p className="text-sm font-semibold">What&apos;s new</p>
              <Link href="/profile?tab=notifications" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-gold">
                DM settings
              </Link>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">Nothing new right now.</p>
            ) : (
              <ul className="max-h-96 divide-y divide-surface-border/60 overflow-y-auto">
                {items.map((item) => {
                  const fresh = Date.parse(item.at) > highlightFrom;
                  const body = (
                    <>
                      <span aria-hidden className="mt-0.5 text-lg">{ICON[item.kind]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">{item.title}</span>
                          <span className="shrink-0 text-[11px] text-muted">{ago(item.at)}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{item.detail}</span>
                      </span>
                      {fresh && <span aria-label="new" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
                    </>
                  );
                  const cls = "flex items-start gap-3 px-4 py-3 transition hover:bg-white/5";
                  return (
                    <li key={item.id}>
                      {item.external ? (
                        <a href={item.href} target="_blank" rel="noreferrer" className={cls}>
                          {body}
                        </a>
                      ) : (
                        <Link href={item.href} onClick={() => setOpen(false)} className={cls}>
                          {body}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
