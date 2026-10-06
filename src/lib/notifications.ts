import { CHANGELOG } from "./changelog";
import { getEvents, getNews, getPolls, getSignups } from "./site";

export type NotificationKind = "event" | "poll" | "signup" | "news" | "update";

export interface Notification {
  /** Stable, so the bell can tell what you've already seen. */
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  href: string;
  /** When it became news (ISO). Anything after the time you last opened the bell counts as new. */
  at: string;
  /** Opens in a new tab (a Discord link), rather than inside the site. */
  external?: boolean;
}

const DAY = 86_400_000;
const trim = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text);

/**
 * What the bell lists: events about to start, polls and signups that opened, the latest Discord announcements, and
 * site updates — newest first. Everything is public clan information, so it is the same for every visitor.
 */
export async function getNotifications(): Promise<Notification[]> {
  const now = Date.now();
  const [events, polls, signups, news] = await Promise.all([getEvents(), getPolls(), getSignups(), getNews()]);
  const items: Notification[] = [];

  for (const e of events ?? []) {
    if (e.status === "COMPLETED" || e.status === "CANCELED") continue;
    const start = Date.parse(e.startTime);
    // An event shows up a week ahead, which is when it counts as "new".
    if (start - 7 * DAY > now || start < now - DAY) continue;
    items.push({ id: `event:${e.id}`, kind: "event", title: e.name, detail: e.status === "ACTIVE" ? "Happening now" : `Starts ${new Date(start).toISOString().slice(0, 10)}`, href: "/events", at: new Date(Math.min(now, start - 7 * DAY)).toISOString() });
  }
  for (const p of polls ?? []) {
    if (!p.active || now - Date.parse(p.createdAt) > 14 * DAY) continue;
    items.push({ id: `poll:${p.id}`, kind: "poll", title: p.title, detail: "New poll — cast your vote", href: "/polls", at: p.createdAt });
  }
  for (const s of signups ?? []) {
    if (s.paused || now - Date.parse(s.createdAt) > 14 * DAY) continue;
    items.push({ id: `signup:${s.id}`, kind: "signup", title: s.title, detail: "Signups are open", href: "/signups", at: s.createdAt });
  }
  for (const post of (news ?? []).slice(0, 6)) {
    if (now - Date.parse(post.postedAt) > 14 * DAY) continue;
    items.push({ id: `news:${post.id}`, kind: "news", title: trim(post.text.replace(/\s+/g, " ") || "New announcement", 70), detail: `Posted in #${post.channel}`, href: post.url, at: post.postedAt, external: true });
  }
  for (const c of CHANGELOG) {
    if (now - Date.parse(c.date) > 30 * DAY) continue;
    items.push({ id: `update:${c.id}`, kind: "update", title: c.title, detail: c.body, href: c.href ?? "/", at: `${c.date}T12:00:00Z` });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15);
}
