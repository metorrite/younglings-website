import type { IconName } from "./icons";

/**
 * The dashboard's sidebar. A feature gets a page of its own here as it moves onto the dashboard: add it to a group and it appears
 * in the sidebar and highlights itself. `soon` entries are placeholders for what is planned, shown dimmed and not clickable.
 */
export interface NavItem {
  label: string;
  icon: IconName;
  /** The page under /dashboard/<server>; empty for the Overview. */
  path?: string;
  /** Other paths that should keep this entry highlighted (the guided setup runs on /wizard). */
  also?: string[];
  soon?: boolean;
  /** Only shown for a server that has a clan set up. */
  clanOnly?: boolean;
}

export interface NavGroup {
  title: string | null;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  { title: null, items: [{ label: "Overview", icon: "home", path: "" }] },
  {
    title: "Setup",
    items: [
      { label: "Server setup", icon: "sliders", path: "/settings" },
      { label: "Roles & permissions", icon: "shield", path: "/permissions" },
      { label: "Guided setup", icon: "wand", path: "/guide", also: ["/wizard"] },
    ],
  },
  {
    title: "Features",
    items: [
      { label: "Commands", icon: "terminal", path: "/commands" },
      { label: "Activity announcements", icon: "bell", path: "/tracking" },
      { label: "Welcome message", icon: "smile", path: "/welcome" },
      { label: "Polls & signups", icon: "poll", path: "/community" },
    ],
  },
  {
    title: "Messages",
    items: [
      { label: "Tickets", icon: "ticket", path: "/tickets" },
      { label: "Post a message", icon: "send", path: "/post" },
      { label: "Scheduled posts", icon: "clock", path: "/scheduled" },
    ],
  },
  {
    title: "Clan",
    items: [{ label: "Roster", icon: "users", path: "/members", clanOnly: true }],
  },
  {
    title: "Server",
    items: [
      { label: "Checkup", icon: "check", path: "/checkup" },
      { label: "Activity log", icon: "list", path: "/audit" },
    ],
  },
];

/** Whether the page at `pathname` belongs to `item`, for highlighting. */
/** The sidebar's groups for a server, leaving out what only a clan server has when this one has no clan, and any group that leaves empty. */
export function groupsFor(hasClan: boolean): NavGroup[] {
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => hasClan || !item.clanOnly) })).filter((group) => group.items.length > 0);
}

export function isActive(item: NavItem, base: string, pathname: string): boolean {
  if (item.path === undefined) return false;
  if (item.path === "") return pathname === base;
  return [item.path, ...(item.also ?? [])].some((p) => pathname.startsWith(`${base}${p}`));
}
