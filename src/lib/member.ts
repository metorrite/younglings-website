/**
 * Server-only client for what a logged-in member does to their own record (`/internal/me/*`): profile text and
 * privacy, DM preferences, skill goals and self-assignable roles.
 *
 * The bot trusts the `userId` it is given, so every function here takes it as an explicit argument and callers
 * must pass ONLY the id from the visitor's verified login session — never anything the browser sent. The
 * Server Actions in `app/profile/actions.ts` are the only callers and do exactly that.
 */

export interface MemberSettings {
  bio: string;
  accentColor: string | null;
  pinnedSkill: number | null;
  hideAdventureLog: boolean;
  hideFromLeaderboards: boolean;
  dmGoals: boolean;
  dmEvents: boolean;
  rsns: string[];
}

export interface Goal {
  id: string;
  skillId: number;
  skill: string;
  targetLevel: number;
  targetXp: number;
  currentXp: number;
  currentLevel: number | null;
  xpRemaining: number;
  /** 0 to 1. */
  progress: number;
  rsn: string;
  createdAt: string;
  achievedAt: string | null;
}

export interface SelfRole {
  roleId: string;
  name: string;
  label: string;
  description: string | null;
  color: number;
  has: boolean;
}

export interface MyPoll {
  pollId: string;
  /** The option numbers this member has picked. */
  mine: number[];
}

export interface MySignups {
  /** Ids of the signup sheets the member is on. */
  joined: string[];
  /** Their linked RuneScape names, to pre-fill a queue signup. */
  rsns: string[];
}

export interface MyCoffer {
  linked: boolean;
  donated: number;
  balance: number;
  donations: { name: string; amount: number; at: string }[];
  giveaways: { amount: number; description: string | null; at: string }[];
}

export interface NewMemberPoll {
  title: string;
  options: string[];
  anonymous: boolean;
  multiple: boolean;
  durationHours: number | null;
}

export type MemberResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function request<T>(method: "GET" | "PUT" | "POST" | "DELETE", path: string, userId: string, body?: Record<string, unknown>): Promise<MemberResult<T>> {
  const baseUrl = process.env.JONNYBOT_INTERNAL_API_URL;
  const secret = process.env.JONNYBOT_INTERNAL_API_SECRET;
  if (!baseUrl || !secret) return { ok: false, status: 0, error: "JonnyBot isn't reachable right now." };

  const readOnly = method === "GET" || method === "DELETE";
  const query = readOnly ? `${path.includes("?") ? "&" : "?"}userId=${encodeURIComponent(userId)}` : "";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/internal/me/${path}${query}`, {
      method,
      headers: { "X-Internal-Secret": secret, ...(readOnly ? {} : { "Content-Type": "application/json" }) },
      body: readOnly ? undefined : JSON.stringify({ ...body, userId }),
      cache: "no-store", // personal data is never cached
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, status: 0, error: "JonnyBot isn't reachable right now." };
  }

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    // leave null
  }
  if (!response.ok) return { ok: false, status: response.status, error: ((json ?? {}) as { error?: string }).error ?? `Request failed (${response.status}).` };
  return { ok: true, data: json as T };
}

export const memberApi = {
  settings: (userId: string) => request<MemberSettings>("GET", "settings", userId),
  saveSettings: (userId: string, settings: Omit<MemberSettings, "rsns">) => request<MemberSettings>("PUT", "settings", userId, settings),
  goals: (userId: string) => request<{ goals: Goal[] }>("GET", "goals", userId),
  addGoal: (userId: string, skillId: number, targetLevel: number) => request<{ goals: Goal[] }>("POST", "goals", userId, { skillId, targetLevel }),
  deleteGoal: (userId: string, goalId: string) => request<{ goals: Goal[] }>("DELETE", `goals?id=${encodeURIComponent(goalId)}`, userId),
  roles: (userId: string) => request<{ roles: SelfRole[] }>("GET", "roles", userId),
  toggleRole: (userId: string, roleId: string, on: boolean) => request<{ roles: SelfRole[] }>("POST", "roles", userId, { roleId, on }),
  myPolls: (userId: string) => request<{ polls: MyPoll[] }>("GET", "polls", userId),
  vote: (userId: string, pollId: string, optionNumber: number) => request<{ polls: MyPoll[] }>("POST", "polls/vote", userId, { pollId, optionNumber }),
  createPoll: (userId: string, poll: NewMemberPoll) => request<{ created: boolean; channel: string }>("POST", "polls", userId, { ...poll }),
  myCoffer: (userId: string) => request<MyCoffer>("GET", "coffer", userId),
  mySignups: (userId: string) => request<MySignups>("GET", "signups", userId),
  joinSignup: (userId: string, signupId: string, body: { rsn?: string; fields?: string[] }) => request<MySignups>("POST", "signups/join", userId, { signupId, ...body }),
  leaveSignup: (userId: string, signupId: string) => request<MySignups>("POST", "signups/leave", userId, { signupId }),
};
