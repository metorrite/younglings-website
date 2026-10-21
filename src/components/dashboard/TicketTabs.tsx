"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { useViewMode } from "@/components/dashboard/ui/ViewMode";

const TABS = [
  { path: "", label: "Panels" },
  { path: "/history", label: "Tickets" },
  { path: "/settings", label: "Settings" },
  { path: "/help-extras", label: "Help extras" },
  { path: "/flags", label: "Flags" },
  { path: "/defaults", label: "Panel defaults" },
];

/**
 * The Tickets header and its tabs, on the pages that are tabs (the panels, the tickets, the settings, the flags, the panel defaults). A page inside one of them (a panel
 * being edited, one ticket) has its own header with a back button instead, so the section's header is not stacked above it.
 */
export function TicketsChrome({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}/tickets`;
  const onATab = [base, ...TABS.map((tab) => `${base}${tab.path}`)].some((path) => pathname === path || pathname === `${path}/`);
  if (!onATab) return null;
  return (
    <>
      <PageHeader title="Tickets" description="Private help channels members open from a panel. Set up what each kind of ticket asks, who helps, and where the record is kept." />
      <TicketTabs guildId={guildId} />
    </>
  );
}

/**
 * The sub-navigation of the Tickets section: its panels, the tickets themselves, and the settings that apply to all of them. "Panel defaults" is a time-saver
 * most servers never open, so it is a tab of the Advanced view (and stays while you are on it).
 */
export function TicketTabs({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}/tickets`;
  const [mode] = useViewMode();
  const tabs = TABS.filter((tab) => (tab.path !== "/defaults" && tab.path !== "/flags") || mode === "advanced" || pathname.startsWith(`${base}${tab.path}`));

  return (
    <nav aria-label="Tickets" className="flex flex-wrap gap-1 border-b border-surface-border">
      {tabs.map((tab) => {
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
