"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_GROUPS } from "@/lib/nav";

/**
 * The grouped navigation menus. Only one is ever open: hovering (or clicking) a group opens it and closes any
 * other, picking a link closes it straight away, and so do Escape, a click elsewhere, and the page changing.
 */
export function NavMenus() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [seenPath, setSeenPath] = useState(pathname);
  const root = useRef<HTMLDivElement>(null);
  const pointer = useRef("mouse");

  // A new page means any menu that was open should be closed (adjusted while rendering, not in an effect).
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(null);
  }

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
              onClick={() => setOpen(isOpen && pointer.current !== "mouse" ? null : group.label)}
              className={`rounded-md px-3 py-2 transition hover:text-foreground ${isOpen || active ? "text-foreground" : ""}`}
            >
              {group.label} <span className="text-[10px]">▾</span>
            </button>
            {isOpen && (
              <div className="nav-pop absolute top-full left-0 z-50 min-w-44 pt-1">
                <ul role="menu" className="overflow-hidden rounded-lg border border-surface-border bg-surface py-1 shadow-xl">
                  {group.links.map((link) => (
                    <li key={link.href} role="none">
                      <Link
                        role="menuitem"
                        href={link.href}
                        onClick={() => setOpen(null)}
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
