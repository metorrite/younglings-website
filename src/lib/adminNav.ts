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
      { href: "/admin/polling-plan", label: "Polling plan", blurb: "Which servers' clans are refreshed on the faster premium plan." },
      { href: "/admin/beta-access", label: "JonnyBot beta access", blurb: "Trusted servers whose admins can use JonnyBot's website while it is closed to everyone else." },
    ],
  },
  {
    id: "monitor",
    label: "Monitor",
    icon: "📈",
    blurb: "Is everything running, and who changed what.",
    pages: [
      { href: "/admin/health", label: "Bot health", blurb: "Connection, database, refresh cycle and memory at a glance." },
    ],
  },
];

/** The group a pathname belongs to: the one whose page has the longest matching address. */
export function activeAdmin(pathname: string): { group: AdminGroup; page: AdminPage } {
  let best: { group: AdminGroup; page: AdminPage } | null = null;
  for (const group of ADMIN_GROUPS) {
    for (const page of group.pages) {
      const matches = page.href === "/admin" ? pathname === "/admin" : pathname === page.href || pathname.startsWith(`${page.href}/`);
      if (matches && (!best || page.href.length > best.page.href.length)) best = { group, page };
    }
  }
  return best ?? { group: ADMIN_GROUPS[0], page: ADMIN_GROUPS[0].pages[0] };
}
