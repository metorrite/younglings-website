"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The hub's section links, with the one you are on lit up. `match` works on the path with or without the /hub prefix (the hub's own host drops it). */
export function HubNavLinks({ links }: { links: { label: string; href: string; path: string }[] }) {
  const pathname = usePathname().replace(/^\/hub/, "") || "/";
  return (
    <nav className="flex items-center gap-1 overflow-x-auto text-sm" aria-label="Main">
      {links.map((l) => {
        const active = l.path === "/" ? pathname === "/" || pathname.startsWith("/c/") : pathname.startsWith(l.path);
        return (
          <Link
            key={l.label}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition ${active ? "bg-gold/15 text-gold" : "text-muted hover:bg-white/5 hover:text-foreground"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
