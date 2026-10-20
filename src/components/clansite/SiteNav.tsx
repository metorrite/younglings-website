"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The site's menu. On a clan's host the visible paths are the site's own (`/`, `/roster`), so the current page is just the path. */
export function SiteNav({ items, centered = false, preview }: { items: { title: string; path: string }[]; centered?: boolean; preview?: { current: string; pick: (path: string) => void } }) {
  const pathname = usePathname() ?? "/";
  // The proxy rewrites <slug>.<domain>/x to /clan-site/<slug>/x; in the browser the path is still /x. In the editor's preview, the page picked.
  const current = preview ? preview.current || "/" : pathname.replace(/^\/clan-site\/[^/]+/, "") || "/";
  return (
    <nav aria-label="Site" className={`flex flex-wrap gap-1 ${centered ? "justify-center" : ""}`}>
      {items.map((item) => {
        const href = item.path || "/";
        const active = href === "/" ? current === "/" : current === href || current.startsWith(`${href}/`);
        const cls = `rounded-md px-3 py-1.5 text-sm transition ${active ? "bg-[var(--cs-primary)] text-white" : "text-[var(--cs-muted)] hover:text-[var(--cs-text)]"}`;
        if (preview) {
          return (
            <button key={href} type="button" aria-pressed={active} onClick={() => preview.pick(item.path)} className={cls}>
              {item.title}
            </button>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cls}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
