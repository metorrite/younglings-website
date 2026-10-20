"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The site's menu. On a clan's host the visible paths are the site's own (`/`, `/roster`), so the current page is just the path. */
export function SiteNav({ items, centered = false }: { items: { title: string; path: string }[]; centered?: boolean }) {
  const pathname = usePathname() ?? "/";
  // The proxy rewrites <slug>.<domain>/x to /clan-site/<slug>/x; in the browser the path is still /x.
  const current = pathname.replace(/^\/clan-site\/[^/]+/, "") || "/";
  return (
    <nav aria-label="Site" className={`flex flex-wrap gap-1 ${centered ? "justify-center" : ""}`}>
      {items.map((item) => {
        const href = item.path || "/";
        const active = href === "/" ? current === "/" : current === href || current.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm transition ${active ? "bg-[var(--cs-primary)] text-white" : "text-[var(--cs-muted)] hover:text-[var(--cs-text)]"}`}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
