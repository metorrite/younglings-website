/**
 * What a visitor has already seen, kept in their browser, shared by the notification bell and the Events menu's bubble.
 *
 * Two moments are remembered: when the bell was last opened (that counts everything as seen) and when the Events pages
 * were last visited or the Events menu used (that counts only events, polls and signups as seen). Either one clears the
 * matching items in both places, so the bell and the bubble never disagree.
 */

const BELL_KEY = "younglings.bell.seen";
const EVENTS_KEY = "younglings.events.seen";
const CHANGED = "younglings:seen-changed";
const DAY = 86_400_000;

/** The kinds of notification the Events menu cares about. */
export const EVENT_KINDS = new Set(["event", "poll", "signup"]);

export function subscribeSeen(notify: () => void): () => void {
  window.addEventListener(CHANGED, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(CHANGED, notify);
    window.removeEventListener("storage", notify);
  };
}

/** A snapshot (stable text, so React can compare it) of both moments; empty parts mean "never". */
export function readSeen(): string {
  try {
    return `${window.localStorage.getItem(BELL_KEY) ?? ""}|${window.localStorage.getItem(EVENTS_KEY) ?? ""}`;
  } catch {
    return "|";
  }
}

function write(key: string) {
  try {
    window.localStorage.setItem(key, new Date().toISOString());
  } catch {
    // can't remember it: the badge returns on the next page load
  }
  window.dispatchEvent(new Event(CHANGED));
}

/** Opening the bell: everything counts as seen. */
export const markBellSeen = () => write(BELL_KEY);

/** Visiting the Events pages or using the Events menu: events, polls and signups count as seen. */
export const markEventsSeen = () => write(EVENTS_KEY);

/** Whether an item (by kind and time) is news given a snapshot from {@link readSeen}. */
export function isUnread(kind: string, at: string, seen: string): boolean {
  const [bell, events] = seen.split("|");
  // A first visit counts the last three days as new, so a brand-new browser isn't greeted by everything ever.
  let since = bell ? Date.parse(bell) : Date.now() - 3 * DAY;
  if (EVENT_KINDS.has(kind) && events) since = Math.max(since, Date.parse(events));
  return Date.parse(at) > since;
}
