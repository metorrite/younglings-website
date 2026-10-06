"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { NAV_GROUPS } from "@/lib/nav";
import { EVENT_KINDS, isUnread, markEventsSeen, readSeen, subscribeSeen } from "@/lib/seen";

/**
 * The grouped navigation menus. Only one is ever open: hovering (or clicking) a group opens it and closes any
 * other, picking a link closes it straight away, and so do Escape, a click elsewhere, and the page changing.
 */
export function NavMenus({ eventBubble }: { eventBubble?: { id: string; kind: string; at: string }[] | null }) {
  const pathname = usePathname();
  // The "something new" bubble on Events (only when an admin has turned it on): events, polls and signups added since you last looked.
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => null);
  const newEvents = eventBubble && seen !== null ? eventBubble.filter((i) => EVENT_KINDS.has(i.kind) && isUnread(i.kind, i.at, seen)).length : 0;
  const eventsGroup = NAV_GROUPS.find((g) => g.label === "Events");
  const onEventsPage = !!eventsGroup && eventsGroup.links.some((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));
  const [open, setOpen] = useState<string | null>(null);
  const [seenPath, setSeenPath] = useState(pathname);
  const root = useRef<HTMLDivElement>(null);
  const pointer = useRef("mouse");

  // A new page means any menu that was open should be closed (adjusted while rendering, not in an effect).
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(null);
  }

  // Being on one of the Events pages means you've seen what's there. (This writes to browser storage, not to React state.)
  useEffect(() => {
    if (onEventsPage) markEventsSeen();
  }, [onEventsPage, pathname]);

  useEffect(() => {
    if (open === null) return;
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="flex items-center gap-1 text-sm text-muted" onMouseLeave={() => setOpen(null)}>
      <Link href="/" className={`rounded-md px-3 py-2 transition hover:text-foreground ${pathname === "/" ? "text-foreground" : ""}`}>
        Home
      </Link>
      {NAV_GROUPS.map((group) => {
        const active = group.links.some((l) => pathname === l.href || (l.href !== "/" && pathname.startsWith(`${l.href}/`)));
        const isOpen = open === group.label;
        return (
          <div key={group.label} className="relative" onMouseEnter={() => setOpen(group.label)}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              onPointerDown={(e) => {
                pointer.current = e.pointerType;
              }}
              // With a mouse the hover has already opened it, so a click must not shut it again; touch and keyboard toggle.
              onClick={() => {
                if (group.label === "Events") markEventsSeen(); // clicking the menu counts as having looked
                setOpen(isOpen && pointer.current !== "mouse" ? null : group.label);
              }}
              className={`rounded-md px-3 py-2 transition hover:text-foreground ${isOpen || active ? "text-foreground" : ""}`}
            >
              {group.label}
              {group.label === "Events" && newEvents > 0 && (
                <span aria-label={`${newEvents} new`} className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 align-middle text-[10px] font-bold text-background">
                  {newEvents > 9 ? "9+" : newEvents}
                </span>
              )}{" "}
              <span className="text-[10px]">▾</span>
            </button>
            {isOpen && (
              <div className="nav-pop absolute top-full left-0 z-50 min-w-44 pt-1">
                <ul role="menu" className="overflow-hidden rounded-lg border border-surface-border bg-surface py-1 shadow-xl">
                  {group.links.map((link) => (
                    <li key={link.href} role="none">
                      <Link
                        role="menuitem"
                        href={link.href}
                        onClick={() => {
                          if (group.label === "Events") markEventsSeen();
                          setOpen(null);
                        }}
                        className={`block px-4 py-2 transition hover:bg-white/5 hover:text-foreground ${pathname === link.href ? "text-gold" : ""}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
