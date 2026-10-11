"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { path: "", label: "Panels" },
  { path: "/history", label: "Tickets" },
  { path: "/settings", label: "Settings" },
  { path: "/defaults", label: "Panel defaults" },
];

/** The sub-navigation of the Tickets section: its panels, the tickets themselves, and the settings that apply to all of them. */
export function TicketTabs({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}/tickets`;

  return (
    <nav aria-label="Tickets" className="flex flex-wrap gap-1 border-b border-surface-border">
      {TABS.map((tab) => {
        const href = `${base}${tab.path}`;
        // the panels tab also covers a single panel's page, which lives under /panels
        const active = tab.path === "" ? pathname === base || pathname.startsWith(`${base}/panels`) : pathname.startsWith(href);
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${active ? "border-gold font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
