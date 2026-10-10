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
    blurb: "What needs attention right now.",
    pages: [{ href: "/admin", label: "Dashboard", blurb: "Health, things that need attention, and shortcuts." }],
  },
  {
    id: "members",
    label: "Members",
    icon: "👥",
    blurb: "See every member at a glance and keep the roster healthy.",
    pages: [
      { href: "/admin/members", label: "Roster", blurb: "Everyone in one table: verified RSN, last and next update, Citadel visit and cap, rank and points, with notes." },
      { href: "/admin/attention", label: "Needs attention", blurb: "Unverified, stale, inactive and uncapped members, and promotions due." },
      { href: "/admin/promotions", label: "Promotions", blurb: "Members whose points have reached their next rank — promote in game, then mark them done." },
    ],
  },
  {
    id: "website",
    label: "Website settings",
    icon: "🌐",
    blurb: "What the public site shows and what members can do on it.",
    pages: [
      { href: "/admin/news", label: "News feed", blurb: "Which Discord channels appear in the middle of the home page." },
      { href: "/admin/community", label: "Community", blurb: "The channel member-created polls are posted in." },
      { href: "/admin/roles", label: "Self roles", blurb: "Roles members can add to or remove from themselves on their profile." },
      { href: "/admin/site-options", label: "Site options", blurb: "How the site behaves for visitors, such as the bubble on the Events menu." },
    ],
  },
  {
    id: "bot",
    label: "Bot settings",
    icon: "🤖",
    blurb: "How JonnyBot behaves in Discord.",
    pages: [
      { href: "/admin/clan", label: "Clan points & ranks", blurb: "Points for membership and Citadel activity, and what each rank needs." },
      { href: "/admin/clan-website", label: "Clan website", blurb: "The address the clan name in Discord links to (same as /configure)." },
      { href: "/admin/tracking", label: "Tracking channels", blurb: "Where drops, quests, boss kills, Citadel, joins and leaves are announced." },
      { href: "/admin/pvm-help", label: "PvM Help", blurb: "The PVM Helper roles and guidelines, and when help tickets ping helpers for members and guests." },
      { href: "/dashboard", label: "Bot dashboard (beta)", blurb: "The dashboard other Discord servers will use to install and set up JonnyBot. Only clan admins can open it for now." },
      { href: "/admin/welcome", label: "Welcome message", blurb: "Greet new members with text and an embed in a channel, and by DM too if you like." },
      { href: "/admin/tickets", label: "Ticket panels", blurb: "Create and edit ticket panels and post them to a channel." },
      { href: "/admin/tickets/defaults", label: "Panel defaults", blurb: "What every new ticket panel starts with: staff roles, who can close, limits and wording." },
      { href: "/admin/tickets/settings", label: "Ticket settings", blurb: "Transcript log channel, retention, and the close delay." },
    ],
  },
  {
    id: "actions",
    label: "Admin actions",
    icon: "⚡",
    blurb: "Do something: post, schedule, run a poll or a signup.",
    pages: [
      { href: "/admin/post", label: "Post a message", blurb: "Write a formatted announcement and post it to any channel, with a check first." },
      { href: "/admin/scheduled", label: "Scheduled posts", blurb: "Queue a message to post later, and cancel it if plans change." },
    ],
  },
  {
    id: "monitor",
    label: "Monitor",
    icon: "📈",
    blurb: "Is everything running, and who changed what.",
    pages: [
      { href: "/admin/health", label: "Bot health", blurb: "Connection, database, refresh cycle and memory at a glance." },
      { href: "/admin/audit", label: "Audit log", blurb: "Every change made from this dashboard, who made it and when." },
      { href: "/admin/tickets/history", label: "Ticket history", blurb: "Browse open and closed tickets and read their saved transcripts." },
    ],
  },
];

/** The group a pathname belongs to: the one whose page has the longest matching address, so /admin/tickets/settings isn't "Ticket panels". */
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
