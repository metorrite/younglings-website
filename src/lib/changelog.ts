/**
 * What's new on the site, newest first. This feeds the bell in the navigation bar — add an entry when something
 * members would want to know about ships. `id` must stay unique and never change (it is how the bell remembers
 * what you've seen); `date` is the day it went live.
 */
export interface ChangelogEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  href?: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "2026-10-skill-progress",
    date: "2026-10-06",
    title: "Skill progress bars",
    body: "Every skill now shows progress towards 99, 110, 120 and 200M XP, plus an Overall tile and a virtual levels switch.",
  },
  {
    id: "2026-10-boss-pages",
    date: "2026-10-06",
    title: "Boss pages and a drop log",
    body: "Every boss now has its own page with a collection-log style drop grid. Filter by boss and time frame.",
    href: "/pvm",
  },
  {
    id: "2026-10-time-frames",
    date: "2026-10-06",
    title: "Time frames on stats",
    body: "Pick this week, month to date, year to date or your own date range on bosses, drops and leaderboards.",
    href: "/leaderboards",
  },
  {
    id: "2026-10-skill-icons",
    date: "2026-10-06",
    title: "Skill icons",
    body: "Profiles now show RuneScape's own skill icons, and big XP milestones read as 200M.",
  },
  {
    id: "2026-10-recaps",
    date: "2026-10-05",
    title: "Recaps",
    body: "A Spotify-Wrapped style recap of your week, month, year or all time — and one for the whole clan.",
    href: "/recap",
  },
  {
    id: "2026-10-link-rsn",
    date: "2026-10-06",
    title: "Link your RuneScape name from the site",
    body: "Sign in with Discord, ask to link your name, and an admin will review it.",
    href: "/profile",
  },
];
