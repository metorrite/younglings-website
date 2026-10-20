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
  /** Only shown to the bot's owner (the bot refuses everyone else whatever the sidebar shows). */
  ownerOnly?: boolean;
}

export interface NavGroup {
  title: string | null;
  items: NavItem[];
}

/**
 * Grouped by the job an admin comes to do (docs/DASHBOARD-NAV.md section 3), setup first and tools last. A new page joins the group for its job;
 * Basic shows at most 7 pages a group, Advanced at most 12.
 */
export const NAV_GROUPS: NavGroup[] = [
  { title: null, items: [{ label: "Overview", icon: "home", path: "" }] },
  {
    title: "Get started",
    items: [
      { label: "Guided setup", icon: "wand", path: "/guide", also: ["/wizard"] },
      { label: "Server setup", icon: "sliders", path: "/settings" },
      { label: "Roles & permissions", icon: "shield", path: "/permissions" },
      { label: "Commands", icon: "terminal", path: "/commands" },
      { label: "Bot appearance", icon: "smile", path: "/branding" },
      { label: "Checkup", icon: "check", path: "/checkup" },
      { label: "Language", icon: "chat", path: "/language", advanced: true },
    ],
  },
  {
    title: "New members & roles",
    items: [
      { label: "Welcome message", icon: "smile", path: "/welcome" },
      { label: "Goodbye message", icon: "door", path: "/goodbye" },
      { label: "Autoroles", icon: "tag", path: "/autoroles" },
      { label: "Role panels", icon: "toggle", path: "/role-panels" },
      { label: "New accounts", icon: "users", path: "/newaccounts", advanced: true },
    ],
  },
  {
    title: "Keep it safe",
    items: [
      { label: "Automod", icon: "shield", path: "/automod" },
      { label: "Warnings", icon: "alert", path: "/warnings" },
      { label: "Lockdown", icon: "shield", path: "/lockdown" },
      { label: "Moderation log", icon: "list", path: "/modlog" },
      { label: "Auto-clean", icon: "broom", path: "/autoclean", advanced: true },
      { label: "Auto-delete", icon: "broom", path: "/autodelete", advanced: true },
      { label: "Message & voice logs", icon: "list", path: "/message-logs", advanced: true },
    ],
  },
  {
    title: "Posts & feeds",
    items: [
      { label: "Post a message", icon: "send", path: "/post" },
      // Until its ban-announcement card moves onto Post a message (T-215).
      { label: "Announcements", icon: "bell", path: "/announcements" },
      { label: "Server reminders", icon: "bell", path: "/server-reminders" },
      { label: "Feeds", icon: "swap", path: "/feeds" },
      { label: "Twitch alerts", icon: "bell", path: "/twitch" },
      { label: "Scheduled posts", icon: "clock", path: "/scheduled", advanced: true },
      { label: "Automatic replies", icon: "chat", path: "/autoresponder", advanced: true },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Polls & signups", icon: "poll", path: "/community" },
      { label: "Giveaways", icon: "gift", path: "/giveaways" },
      { label: "Suggestions", icon: "bulb", path: "/suggestions" },
      { label: "Starboard", icon: "star", path: "/starboard" },
      { label: "Points", icon: "trophy", path: "/points" },
      { label: "Tickets", icon: "ticket", path: "/tickets" },
      { label: "Web forms", icon: "list", path: "/forms" },
      { label: "Chat levels", icon: "trophy", path: "/chat-levels", advanced: true },
      { label: "Highlights", icon: "bell", path: "/highlights", advanced: true },
      { label: "Temp voice", icon: "users", path: "/temp-voice", advanced: true },
      { label: "Voice text", icon: "chat", path: "/voice-text", advanced: true },
    ],
  },
  {
    title: "Events",
    items: [
      { label: "Event manager", icon: "clock", path: "/event-manager" },
      { label: "Event announcer", icon: "bell", path: "/event-announcer", advanced: true },
      { label: "Citadel wheel", icon: "gift", path: "/citadel-wheel", advanced: true },
      { label: "Discord events", icon: "clock", path: "/events", clanOnly: true, advanced: true },
    ],
  },
  {
    title: "RuneScape clan",
    items: [
      { label: "Clan profile", icon: "smile", path: "/clan-profile", clanOnly: true },
      { label: "Roster", icon: "users", path: "/members", clanOnly: true },
      { label: "Clan activity feed", icon: "bell", path: "/tracking" },
      { label: "RuneScape timers", icon: "clock", path: "/rs-timers" },
      { label: "Alliances", icon: "users", path: "/alliances", clanOnly: true, advanced: true },
      { label: "Clan plugin", icon: "swap", path: "/plugin", clanOnly: true, advanced: true },
      { label: "Fix clan roles", icon: "check", path: "/role-sync", clanOnly: true, advanced: true },
    ],
  },
  {
    title: "Logs & tools",
    items: [
      { label: "Activity log", icon: "list", path: "/audit", advanced: true },
      { label: "Snapshots", icon: "terminal", path: "/snapshots", ownerOnly: true, advanced: true },
    ],
  },
];

/** The sidebar's groups for a server, leaving out what only a clan server has when this one has no clan, what only the bot's owner sees when this person isn't, and any group that leaves empty. */
export function groupsFor(hasClan: boolean, isOwner = false): NavGroup[] {
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => (hasClan || !item.clanOnly) && (isOwner || !item.ownerOnly)) })).filter((group) => group.items.length > 0);
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
