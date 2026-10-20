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
  /** Keep this person's Discord name in "Who's Online" from linking to their clan profile. */
  hideDiscordLink: boolean;
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

/** One event the member is in, as the bot reports it (`/internal/me/events`). Only their own rows. */
export interface MyEvent {
  id: string;
  name: string;
  description: string;
  template: string;
  status: "SIGNUPS" | "RUNNING" | "SCORING" | "DONE" | "CANCELLED";
  scoringMode: "INDIVIDUAL" | "TEAM";
  waiting: boolean;
  team: string | null;
  buyIn: { enabled: boolean; amount: number; status: "NONE" | "DUE" | "PAID" | "REFUNDED" };
  /** 0 until they have a place in the standings. */
  rank: number;
  of: number;
  points: number;
  objectives: { key: string; label: string; points: number; target: number; repeatLimit: number; done: number }[];
  pendingProof: number;
  /** Whether the event asks players to be verified, where theirs stands, why it was turned down (only while it is), and what they were told to send. */
  verification: { required: boolean; state: "NOT_REQUIRED" | "PENDING" | "VERIFIED" | "REJECTED" | "WAIVED"; note: string; instructions: string };
  awards: { place: number; kind: "IN_GAME" | "CLAN_POINTS" | "OTHER"; description: string; amount: number; status: "PENDING" | "PAID" | "REVOKED" | "REFUNDED" }[];
}

export interface OpenEvent {
  id: string;
  name: string;
  description: string;
  template: string;
  scoringMode: "INDIVIDUAL" | "TEAM";
  signupClosesAt: string | null;
  buyIn: number;
  /** An organiser has closed signups: players can't join themselves any more. */
  closed: boolean;
  /** Players have to be verified to take part. */
  verification: boolean;
}

export interface MyEvents {
  events: MyEvent[];
  open: OpenEvent[];
  /** After a join: whether the player got a place or went on the waitlist. */
  result?: { waiting: boolean; position: number };
}

/** A member's own Highlights words (direct messages when someone says them) and the channels they skip. */
export interface MyHighlights {
  enabled: boolean;
  /** Whether this member may use Highlights here; when not, `refusal` says why. */
  usable: boolean;
  refusal: string | null;
  words: { id: string; word: string; wholeWord: boolean }[];
  max: number;
  maxWord: number;
  minWord: number;
  cooldownSeconds: number;
  ignored: { id: string; name: string }[];
  maxIgnored: number;
  /** Channels the member can see and has not skipped yet. */
  channels: { id: string; name: string }[];
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

export interface LinkResult {
  state: "NONE" | "PENDING" | "LINKED";
  rsns: string[];
  pendingRsn: string | null;
  submitted?: boolean;
}

export const memberApi = {
  /** Ask to link a RuneScape name (an admin reviews it, exactly as with /rs in Discord). */
  submitLink: (userId: string, rsn: string) => request<LinkResult>("POST", "link", userId, { rsn }),
  /** Withdraw this member's own pending request. */
  cancelLink: (userId: string) => request<LinkResult>("DELETE", "link", userId),
  settings: (userId: string) => request<MemberSettings>("GET", "settings", userId),
  saveSettings: (userId: string, settings: Omit<MemberSettings, "rsns">) => request<MemberSettings>("PUT", "settings", userId, settings),
  highlights: (userId: string) => request<MyHighlights>("GET", "highlights", userId),
  addHighlight: (userId: string, word: string, wholeWord: boolean) => request<MyHighlights>("POST", "highlights", userId, { word, wholeWord }),
  removeHighlight: (userId: string, id: string) => request<MyHighlights>("DELETE", `highlights?id=${encodeURIComponent(id)}`, userId),
  ignoreHighlightChannel: (userId: string, channelId: string, ignored: boolean) => request<MyHighlights>("POST", "highlights/ignore", userId, { channelId, ignored }),
  goals: (userId: string) => request<{ goals: Goal[] }>("GET", "goals", userId),
  addGoal: (userId: string, skillId: number, targetLevel: number) => request<{ goals: Goal[] }>("POST", "goals", userId, { skillId, targetLevel }),
  deleteGoal: (userId: string, goalId: string) => request<{ goals: Goal[] }>("DELETE", `goals?id=${encodeURIComponent(goalId)}`, userId),
  roles: (userId: string) => request<{ roles: SelfRole[] }>("GET", "roles", userId),
  toggleRole: (userId: string, roleId: string, on: boolean) => request<{ roles: SelfRole[] }>("POST", "roles", userId, { roleId, on }),
  myPolls: (userId: string) => request<{ polls: MyPoll[] }>("GET", "polls", userId),
  vote: (userId: string, pollId: string, optionNumber: number) => request<{ polls: MyPoll[] }>("POST", "polls/vote", userId, { pollId, optionNumber }),
  createPoll: (userId: string, poll: NewMemberPoll) => request<{ created: boolean; channel: string }>("POST", "polls", userId, { ...poll }),
  myEvents: (userId: string) => request<MyEvents>("GET", "events", userId),
  /** One event as the member sees it: the schedule, their team, progress, submissions and channel links. */
  eventPage: (userId: string, eventId: string) => request<EventPage>("GET", `events/detail?eventId=${encodeURIComponent(eventId)}`, userId),
  /** Sign up for an event by the same rules as /events join: the member has to be in the Discord server. */
  joinEvent: (userId: string, eventId: string) => request<MyEvents>("POST", "events/join", userId, { eventId }),
  leaveEvent: (userId: string, eventId: string) => request<MyEvents>("POST", "events/leave", userId, { eventId }),
  myCoffer: (userId: string) => request<MyCoffer>("GET", "coffer", userId),
  mySignups: (userId: string) => request<MySignups>("GET", "signups", userId),
  joinSignup: (userId: string, signupId: string, body: { rsn?: string; fields?: string[] }) => request<MySignups>("POST", "signups/join", userId, { signupId, ...body }),
  leaveSignup: (userId: string, signupId: string) => request<MySignups>("POST", "signups/leave", userId, { signupId }),
};

/** One event as its player sees it (`/internal/me/events/detail`). A member who isn't in it yet gets `me: null` and only the public part. */
export interface EventPage {
  event: {
    id: string;
    name: string;
    description: string;
    template: string;
    status: "SIGNUPS" | "RUNNING" | "SCORING" | "DONE" | "CANCELLED";
    scoringMode: "INDIVIDUAL" | "TEAM";
    startsAt: string | null;
    endsAt: string | null;
    signupClosesAt: string | null;
    signupsClosed: boolean;
    maxParticipants: number;
    players: number;
    buyIn: { enabled: boolean; amount: number };
    verificationRequired: boolean;
    verificationInstructions: string;
  };
  me: {
    waiting: boolean;
    team: string | null;
    buyIn: { enabled: boolean; amount: number; status: "NONE" | "DUE" | "PAID" | "REFUNDED" };
    verification: { required: boolean; state: "NOT_REQUIRED" | "PENDING" | "VERIFIED" | "REJECTED" | "WAIVED"; note: string; waitingProof: boolean };
  } | null;
  prizes: { place: number; placeTo: number; kind: "IN_GAME" | "CLAN_POINTS" | "OTHER"; description: string; amount: number }[];
  // everything below is only present when `me` is
  teammates?: { name: string; me: boolean }[];
  standings?: { rows: { rank: number; name: string; points: number; me: boolean }[]; of: number; myRank: number; myPoints: number };
  objectives?: { key: string; label: string; points: number; target: number; repeatLimit: number; done: number }[];
  /** A bingo's board for this player, in tile order; `columns` is 0 when the board isn't a square grid (draw it as a list). */
  board?: { tiles: { n: number; label: string; points: number; done: boolean; locked: boolean }[]; columns: number } | null;
  submissions?: { id: string; kind: "OBJECTIVE" | "VERIFICATION"; label: string; status: "PENDING" | "APPROVED" | "DENIED"; note: string; decisionNote: string | null; createdAt: string }[];
  awards?: { place: number; kind: "IN_GAME" | "CLAN_POINTS" | "OTHER"; description: string; amount: number; status: "PENDING" | "PAID" | "REVOKED" | "REFUNDED" }[];
  channels?: { label: string; url: string }[];
  canSubmit?: boolean;
}
