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
  /**
   * A page most servers never need to open. The sidebar leaves it out in the Basic view (the page itself, a page starred by this person and the search still
   * reach it) and lists it in the Advanced view.
   */
  advanced?: boolean;
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
      { label: "Bot appearance", icon: "smile", path: "/branding" },
      { label: "Roles & permissions", icon: "shield", path: "/permissions" },
      { label: "Guided setup", icon: "wand", path: "/guide", also: ["/wizard"] },
    ],
  },
  {
    title: "Members",
    items: [
      { label: "Welcome message", icon: "smile", path: "/welcome" },
      { label: "Goodbye message", icon: "door", path: "/goodbye" },
      { label: "Autoroles", icon: "tag", path: "/autoroles" },
      { label: "Role panels", icon: "toggle", path: "/role-panels" },
    ],
  },
  {
    title: "Features",
    items: [
      { label: "Commands", icon: "terminal", path: "/commands" },
      { label: "Activity announcements", icon: "bell", path: "/tracking" },
      { label: "Automatic replies", icon: "chat", path: "/autoresponder", advanced: true },
      { label: "Polls & signups", icon: "poll", path: "/community" },
      { label: "Tickets", icon: "ticket", path: "/tickets" },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Starboard", icon: "star", path: "/starboard" },
      { label: "Temp voice", icon: "users", path: "/temp-voice", advanced: true },
      { label: "Giveaways", icon: "gift", path: "/giveaways" },
      { label: "Citadel wheel", icon: "gift", path: "/citadel-wheel", advanced: true },
      { label: "Suggestions", icon: "bulb", path: "/suggestions" },
      { label: "Points", icon: "trophy", path: "/points" },
      { label: "Event manager", icon: "clock", path: "/event-manager" },
    ],
  },
  {
    title: "Moderation",
    items: [
      { label: "Warnings", icon: "alert", path: "/warnings" },
      { label: "Automod", icon: "shield", path: "/automod" },
      { label: "Moderation log", icon: "list", path: "/modlog" },
      { label: "New accounts", icon: "users", path: "/newaccounts", advanced: true },
      { label: "Auto-clean", icon: "broom", path: "/autoclean", advanced: true },
      { label: "Auto-delete", icon: "broom", path: "/autodelete", advanced: true },
    ],
  },
  {
    title: "Messages",
    items: [
      { label: "Post a message", icon: "send", path: "/post" },
      { label: "Scheduled posts", icon: "clock", path: "/scheduled", advanced: true },
      { label: "Feeds", icon: "swap", path: "/feeds" },
    ],
  },
  {
    title: "Clan",
    items: [
      { label: "Clan profile", icon: "smile", path: "/clan-profile", clanOnly: true },
      { label: "Public events", icon: "clock", path: "/events", clanOnly: true, advanced: true },
      { label: "Alliances", icon: "users", path: "/alliances", clanOnly: true, advanced: true },
      { label: "Clan plugin", icon: "swap", path: "/plugin", clanOnly: true, advanced: true },
      { label: "Roster", icon: "users", path: "/members", clanOnly: true },
    ],
  },
  {
    title: "Server",
    items: [
      { label: "Checkup", icon: "check", path: "/checkup" },
      { label: "Activity log", icon: "list", path: "/audit", advanced: true },
    ],
  },
];

/** The sidebar's groups for a server, leaving out what only a clan server has when this one has no clan, and any group that leaves empty. */
export function groupsFor(hasClan: boolean): NavGroup[] {
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => hasClan || !item.clanOnly) })).filter((group) => group.items.length > 0);
}

/**
 * The groups as the sidebar shows them in the Basic or the Advanced view. In Basic an `advanced` page is left out unless `keep` says to show it (the page
 * being looked at, a starred one), and a group left empty goes too. `hidden` is how many pages Basic leaves out, for the line that offers them.
 */
export function visibleGroups(groups: NavGroup[], advancedView: boolean, keep: (item: NavItem) => boolean): { groups: NavGroup[]; hidden: number } {
  if (advancedView) return { groups, hidden: 0 };
  let hidden = 0;
  const shown = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.advanced || keep(item)) return true;
        hidden++;
        return false;
      }),
    }))
    .filter((group) => group.items.length > 0);
  return { groups: shown, hidden };
}

/** Every page of the sidebar by its path, for a server that has (or hasn't) a clan. */
export function itemsByPath(hasClan: boolean): Map<string, NavItem> {
  const map = new Map<string, NavItem>();
  for (const group of groupsFor(hasClan)) {
    for (const item of group.items) if (item.path !== undefined && item.path !== "" && !item.soon) map.set(item.path, item);
  }
  return map;
}

/** The starred pages as sidebar items, in the order they were starred; a path that is no longer a page (or isn't one of this server's) is left out. */
export function favoriteItems(paths: readonly string[], hasClan: boolean): NavItem[] {
  const all = itemsByPath(hasClan);
  return paths.map((p) => all.get(p)).filter((item): item is NavItem => item !== undefined);
}

/** The quick links of the Overview: the starred pages, or four usual ones until something is starred. */
export const DEFAULT_QUICK_PATHS = ["/settings", "/permissions", "/commands", "/welcome"] as const;

/** Whether the page at `pathname` belongs to `item`, for highlighting. */
export function isActive(item: NavItem, base: string, pathname: string): boolean {
  if (item.path === undefined) return false;
  if (item.path === "") return pathname === base;
  return [item.path, ...(item.also ?? [])].some((p) => pathname.startsWith(`${base}${p}`));
}
