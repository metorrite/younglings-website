/**
 * Server-only client for JonnyBot's internal API (online members, scheduled events). Never call
 * these from a Client Component — the shared secret must stay server-side.
 *
 * Both functions return `null` (rather than throwing) whenever the API isn't configured or isn't
 * reachable, so the UI can fall back to a "coming soon" message instead of breaking the page.
 */

export interface OnlineMember {
  id: string;
  displayName: string;
  avatarUrl: string;
  status: "online" | "idle" | "dnd";
  topRole: { name: string; colorRaw: number } | null;
}

export interface ScheduledEvent {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  location: string | null;
  startTime: string;
  endTime: string | null;
  interestedCount: number;
}

export interface MemberInfo {
  id: string;
  username: string;
  nickname: string | null;
  displayName: string;
  avatarUrl: string;
  colorRole: string | null;
}

/**
 * The self-assignable "name color" roles offered on the profile page. Must match
 * ColorRoleCatalog on JonnyBot's side (same keys, same hex values) — there's no endpoint to fetch
 * this list live, since it's a small fixed set that rarely changes.
 */
export const COLOR_PALETTE: Record<string, string> = {
  Red: "#e74c3c",
  Orange: "#e67e22",
  Yellow: "#f1c40f",
  Green: "#2ecc71",
  Teal: "#1abc9c",
  Blue: "#3498db",
  Purple: "#9b59b6",
  Pink: "#e91e8c",
};

async function fetchInternal<T>(path: string): Promise<T | null> {
  const baseUrl = process.env.JONNYBOT_INTERNAL_API_URL;
  const secret = process.env.JONNYBOT_INTERNAL_API_SECRET;

  if (!baseUrl || !secret) return null;

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "X-Internal-Secret": secret },
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function postInternal<T>(path: string, body: unknown): Promise<T | null> {
  const baseUrl = process.env.JONNYBOT_INTERNAL_API_URL;
  const secret = process.env.JONNYBOT_INTERNAL_API_SECRET;

  if (!baseUrl || !secret) return null;

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "X-Internal-Secret": secret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getOnlineMembers(): Promise<OnlineMember[] | null> {
  const data = await fetchInternal<{ members: OnlineMember[] }>("/internal/online-members");
  return data?.members ?? null;
}

export async function getUpcomingEvents(): Promise<ScheduledEvent[] | null> {
  const data = await fetchInternal<{ events: ScheduledEvent[] }>("/internal/events");
  return data?.events ?? null;
}

/** This member's current username/nickname/color role, or null if JonnyBot isn't reachable. */
export async function getMemberInfo(userId: string): Promise<MemberInfo | null> {
  return fetchInternal<MemberInfo>(`/internal/member?userId=${encodeURIComponent(userId)}`);
}

/** Sets (or, with `nickname: null`, clears) this member's server nickname. Returns whether it succeeded. */
export async function setNickname(userId: string, nickname: string | null): Promise<boolean> {
  const result = await postInternal<{ nickname: string | null }>("/internal/nickname", { userId, nickname });
  return result !== null;
}

/** Sets (or, with `color: null`, clears) this member's cosmetic color role. Returns whether it succeeded. */
export async function setColorRole(userId: string, color: string | null): Promise<boolean> {
  const result = await postInternal<{ colorRole: string | null }>("/internal/color-role", { userId, color });
  return result !== null;
}

/** A role's raw color as CSS, or undefined if the role has no color set (JDA's "no color" sentinel). */
export function roleColorCss(colorRaw: number | undefined): string | undefined {
  if (colorRaw === undefined || colorRaw < 0 || colorRaw > 0xffffff) return undefined;
  return `#${colorRaw.toString(16).padStart(6, "0")}`;
}

/** "Today" / "Tomorrow" / "In N days" / a short date, for an event's start time. */
export function formatEventWhen(startTimeIso: string): string {
  const start = new Date(startTimeIso);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((startDay.getTime() - todayDay.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `In ${diffDays} days`;
  return start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
