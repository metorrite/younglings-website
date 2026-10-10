"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The sections of one server's dashboard. Add a feature's page here as it moves onto the dashboard. */
const TABS = [
  { path: "", label: "Overview" },
  { path: "/settings", label: "Settings" },
  { path: "/permissions", label: "Roles & permissions" },
  { path: "/commands", label: "Commands" },
  { path: "/tracking", label: "Tracking channels" },
  { path: "/welcome", label: "Welcome message" },
];

export function GuildTabs({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}`;

  return (
    <nav aria-label="Server settings" className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const href = `${base}${tab.path}`;
        const active = tab.path === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.path}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md border px-3 py-1.5 text-sm transition ${active ? "border-gold bg-gold/10 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
