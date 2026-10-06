"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_GROUPS, activeAdmin } from "@/lib/adminNav";

/**
 * The admin header. The top row lists the groups; the row beneath shows the pages of whichever group you're in and
 * changes as you move between them, so you always see the siblings of the page you're on.
 */
export function AdminNav({ name, avatarUrl, tier }: { name: string; avatarUrl: string | null; tier: string }) {
  const pathname = usePathname();
  const { group, page } = activeAdmin(pathname);

  return (
    <div className="mb-8 border-b border-surface-border">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href="/admin" className="mr-2 text-lg font-semibold text-gold">
            Admin
          </Link>
          {ADMIN_GROUPS.map((g) => {
            const active = g.id === group.id;
            return (
              <Link
                key={g.id}
                href={g.pages[0].href}
                aria-current={active ? "true" : undefined}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors duration-200 ${active ? "border-gold bg-gold/15 text-gold" : "border-transparent text-muted hover:text-foreground"}`}
              >
                <span aria-hidden>{g.icon}</span>
                {g.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          {avatarUrl && <Image src={avatarUrl} alt="" width={24} height={24} className="rounded-full" />}
          {name}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{tier === "ADMIN" ? "Admin" : "Developer"}</span>
        </div>
      </div>

      {/* Keyed by the group so the sub-row fades in fresh when you change groups. */}
      <nav key={group.id} className="hub-in flex flex-wrap gap-x-1 gap-y-1 pb-3 text-sm" aria-label={`${group.label} pages`}>
        {group.pages.map((p) => {
          const active = p.href === page.href;
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 transition-colors duration-200 ${active ? "bg-white/10 text-foreground" : "text-muted hover:bg-white/5 hover:text-foreground"}`}
            >
              {p.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
