export interface AdminPage {
  href: string;
  label: string;
  /** One line shown on the admin home page. */
  blurb: string;
}

export interface AdminGroup {
  id: string;
  label: string;
  icon: string;
  blurb: string;
  /** Only the bot's owner sees (and may open) this group. The pages enforce it themselves; hiding it here is only a convenience. */
  ownerOnly?: boolean;
  pages: AdminPage[];
}

/**
 * How the admin area is organised. The top bar shows the groups; opening one swaps the second bar for that group's
 * pages, and the admin home lists them all with a line each. Views (things to look at) and tools (things to change)
 * sit side by side in the group they belong to.
 */
export const ADMIN_GROUPS: AdminGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "🏠",
    blurb: "The Younglings website settings.",
    pages: [{ href: "/admin", label: "Home", blurb: "Shortcuts to the website settings." }],
  },
  {
    id: "website",
    label: "Website settings",
    icon: "🌐",
    blurb: "What the Younglings site shows to visitors.",
    pages: [
      { href: "/admin/news", label: "News feed", blurb: "Which Discord channels appear in the middle of the home page." },
      { href: "/admin/site-options", label: "Site options", blurb: "How the site behaves for visitors, such as the bubble on the Events menu." },
    ],
  },
  {
    id: "monitor",
    label: "Monitor",
    icon: "📈",
    blurb: "Is everything running, and who changed what.",
    pages: [
      { href: "/admin/audit", label: "Audit log", blurb: "Every change made from this dashboard, who made it and when." },
      { href: "/admin/tickets/history", label: "Ticket history", blurb: "Browse open and closed tickets and read their saved transcripts." },
      { href: "/admin/health", label: "Bot health", blurb: "Connection, database, refresh cycle and memory at a glance." },
    ],
  },
  {
    id: "super",
    label: "Super admin",
    icon: "🛡️",
    blurb: "Owner only: the controls that decide who gets what across every server.",
    ownerOnly: true,
    pages: [
      { href: "/admin/super", label: "Super admin", blurb: "Overview of the owner-only controls." },
      { href: "/admin/polling-plan", label: "Premium servers", blurb: "Which servers' clans are refreshed on the faster premium plan." },
      { href: "/admin/site-access", label: "Site access", blurb: "Open or close the JonnyBot website, the clans hub and the bot dashboard without a redeploy." },
      { href: "/admin/access", label: "Restricted access", blurb: "Let a person, or a server at a permission level, into restricted parts of the site." },
      { href: "/admin/beta-access", label: "Beta servers", blurb: "Trusted servers whose admins can use JonnyBot's website while it is closed to everyone else." },
      { href: "/admin/health", label: "Bot health", blurb: "Platform-wide: connection, database, refresh cycle and memory at a glance." },
    ],
  },
];

/** The group a pathname belongs to: the one whose page has the longest matching address, so /admin/tickets/settings isn't "Ticket panels". */
export function activeAdmin(pathname: string, groups: AdminGroup[] = ADMIN_GROUPS): { group: AdminGroup; page: AdminPage } {
/** The group a pathname belongs to: the one whose page has the longest matching address. */
export function activeAdmin(pathname: string): { group: AdminGroup; page: AdminPage } {
  let best: { group: AdminGroup; page: AdminPage } | null = null;
  for (const group of groups) {
    for (const page of group.pages) {
      const matches = page.href === "/admin" ? pathname === "/admin" : pathname === page.href || pathname.startsWith(`${page.href}/`);
      if (matches && (!best || page.href.length > best.page.href.length)) best = { group, page };
    }
  }
  return best ?? { group: groups[0], page: groups[0].pages[0] };
}

/** The groups a person may see: the owner-only ones are left out for everyone but the bot's owner, and empty ones for everybody. */
export function adminGroupsFor(isOwner: boolean, groups: AdminGroup[] = ADMIN_GROUPS): AdminGroup[] {
  // A group whose pages have all moved elsewhere is left out: the header links each group to its first page.
  return groups.filter((g) => g.pages.length > 0 && (isOwner || !g.ownerOnly));
}
