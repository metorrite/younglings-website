export interface NavLink {
  href: string;
  label: string;
}

/** The site's pages, grouped for the navigation menus. */
export const NAV_GROUPS: { label: string; links: NavLink[] }[] = [
  {
    label: "Clan",
    links: [
      { href: "/members", label: "Members" },
      { href: "/activity", label: "Activity" },
      { href: "/hall-of-fame", label: "Hall of Fame" },
      { href: "/history", label: "History" },
      { href: "/compare", label: "Compare" },
    ],
  },
  {
    label: "Stats",
    links: [
      { href: "/stats", label: "Overview" },
      { href: "/recap", label: "Recaps" },
      { href: "/leaderboards", label: "Leaderboards" },
      { href: "/citadel", label: "Citadel" },
      { href: "/pvm", label: "PvM & bosses" },
      { href: "/drops", label: "Drop log" },
      { href: "/coffer", label: "Coffer" },
    ],
  },
  {
    label: "Events",
    links: [
      { href: "/events", label: "Upcoming" },
      { href: "/events/calendar", label: "Calendar" },
      { href: "/signups", label: "Signups" },
      { href: "/polls", label: "Polls" },
    ],
  },
];

export const ALL_NAV_LINKS: NavLink[] = [{ href: "/", label: "Home" }, ...NAV_GROUPS.flatMap((g) => g.links)];

/** The few pages that stay inside the persistent header: Home plus the four primary sections. */
export const HUB_TABS: { href: string; label: string; match: (pathname: string) => boolean }[] = [
  { href: "/", label: "Home", match: (p) => p === "/" },
  { href: "/members", label: "Browse members", match: (p) => p.startsWith("/members") },
  { href: "/stats", label: "Clan stats", match: (p) => p.startsWith("/stats") },
  { href: "/events", label: "Events", match: (p) => p.startsWith("/events") },
  { href: "/recap", label: "Recaps", match: (p) => p.startsWith("/recap") },
];
