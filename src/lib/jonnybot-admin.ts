/**
 * Server-only client for the admin routes of JonnyBot's internal API (the ticket dashboard). Never import
 * this from a Client Component — the shared secret must stay on the server.
 *
 * Two checks protect these routes, and neither is skippable:
 *  1. The shared secret (`X-Internal-Secret`) proves the request comes from this website's backend.
 *  2. The acting user's Discord ID (`X-Actor-Id`) is looked up by the *bot itself* on every request, which
 *     refuses unless they are Admin tier or hold the Developer role in the server.
 *
 * Every function here therefore takes an {@link AdminContext}, and the only way to get one is
 * `requireAdmin()` in `lib/admin.ts` (which reads the user from the verified login session and asks the bot
 * `whoami`). The actor ID is never taken from anything the browser sends.
 */

declare const adminContextBrand: unique symbol;

/** Proof that the current request's user was verified as an admin. Only `lib/admin.ts` creates one. */
export interface AdminContext {
  readonly [adminContextBrand]: true;
  readonly actorId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly tier: "ADMIN" | "DEVELOPER";
}

export function createAdminContext(actor: Omit<AdminContext, typeof adminContextBrand>): AdminContext {
  return actor as AdminContext;
}

// ---------- shapes the bot returns ----------

export interface WhoAmI {
  allowed: boolean;
  tier: "ADMIN" | "DEVELOPER" | "NONE";
  id?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface GuildRole {
  id: string;
  name: string;
  /** 0 when the role has no color. */
  color: number;
  managed: boolean;
  position: number;
}

export interface GuildStructure {
  roles: GuildRole[];
  categories: { id: string; name: string }[];
  channels: { id: string; name: string; category: string | null; canPost: boolean }[];
}

export interface TicketSettings {
  logChannelId: string | null;
  nextNumber: number;
  transcriptDm: boolean;
  closeDelaySeconds: number;
  transcriptRetentionDays: number | null;
}

export type FieldKind = "SHORT" | "PARAGRAPH" | "SELECT" | "CHECKBOX";

/** Which part of the PvM Help system a panel belongs to; NONE is an ordinary ticket panel. */
export type HelpKind = "NONE" | "PVM" | "CA";

/**
 * What a question means to the PvM Help rules: the boss, the tier, the one achievement they want help with, or whether they have already made
 * attempts. A help panel with a boss question is filled in step by step in Discord (boss, tier and achievement chosen from the achievement
 * catalogue), then a small form with the rest.
 */
export type FieldPurpose = "NONE" | "BOSS" | "TIER" | "ACHIEVEMENT" | "ATTEMPTS";

export interface PanelOption {
  label: string;
  pingRoleId: string | null;
  escalateRoleId: string | null;
}

export interface PanelField {
  label: string;
  kind: FieldKind;
  required: boolean;
  placeholder: string | null;
  maxLength: number | null;
  /** The part this question plays in the PvM Help rules (only meaningful on a PvM Help or CA Help panel). */
  purpose: FieldPurpose;
  options: PanelOption[];
}

/** What the editor sends (and the bot returns). `id` is absent for a panel that hasn't been created yet. */
export interface PanelDefinition {
  id?: string;
  name: string;
  title: string;
  description: string;
  buttonLabel: string;
  categoryId: string | null;
  channelNameTemplate: string;
  welcomeText: string;
  /** The plain-text line above a new ticket's embeds. Placeholders such as {user} and {ping} are filled in when the ticket opens. */
  openingMessage: string;
  /** Whether the person who opened a ticket may press Close on it. */
  closeByRequester: boolean;
  /** Whether helpers who joined a ticket may press Close on it. */
  closeByHelpers: boolean;
  /** Whether the PvM Help rules (member and guest pings, the Master+ attempts rule) apply to this panel's tickets. */
  helpKind: HelpKind;
  enabled: boolean;
  perUserLimit: number;
  defaultPingRoleId: string | null;
  helperCap: number | null;
  escalationHours: number | null;
  defaultEscalateRoleId: string | null;
  postedChannelId?: string | null;
  postedMessageId?: string | null;
  helperRoleIds: string[];
  staffRoleIds: string[];
  /** Roles that may close any ticket on the panel (staff roles and admins always can). */
  closeRoleIds: string[];
  fields: PanelField[];
}

/** What a new panel starts with: the shared settings, never a panel's own name, title, description or questions. */
export type PanelDefaults = Pick<
  PanelDefinition,
  | "buttonLabel"
  | "categoryId"
  | "channelNameTemplate"
  | "welcomeText"
  | "openingMessage"
  | "perUserLimit"
  | "defaultPingRoleId"
  | "helperCap"
  | "escalationHours"
  | "defaultEscalateRoleId"
  | "closeByRequester"
  | "closeByHelpers"
  | "helperRoleIds"
  | "staffRoleIds"
  | "closeRoleIds"
>;

/** The PvM Help system's settings for the server. Hours of null mean "never escalate". */
export interface HelpSettings {
  helperRoleId: string | null;
  helperPlusRoleId: string | null;
  /** The text members see; the built-in draft until an admin edits it. */
  guidelines: string;
  guidelinesAreDefault: boolean;
  defaultGuidelines: string;
  memberPingOnOpen: boolean;
  memberEscalationHours: number | null;
  guestPingsEnabled: boolean;
  guestPingOnOpen: boolean;
  guestEscalationHours: number | null;
  guestHighTierNeedsAttempts: boolean;
  highTierLabels: string;
  postedChannelId: string | null;
}

export interface PanelSummary {
  id: string;
  name: string;
  title: string;
  enabled: boolean;
  helperCap: number | null;
  postedChannelId: string | null;
  fieldCount: number;
  openTickets: number;
}

export interface TicketRow {
  id: string;
  number: number;
  panelId: string | null;
  panelName: string | null;
  channelId: string | null;
  requesterId: string;
  requesterName: string | null;
  status: "OPEN" | "CLOSED";
  routingLabel: string | null;
  answers: { label: string; answer: string }[];
  createdAt: string;
  escalatedAt: string | null;
  closedAt: string | null;
  closedBy: string | null;
  closeReason: string | null;
  channelDeleted: boolean;
}

export interface SelfRoleConfig {
  roleId: string;
  name: string | null;
  label: string | null;
  description: string | null;
  /** False when the role was deleted, moved above JonnyBot's own role, or now carries powerful permissions. */
  safe: boolean;
}

export interface AdminSignupSheet {
  id: string;
  title: string;
  type: "QUEUE" | "GROUP" | "SUBMISSION";
  paused: boolean;
  /** Entries with the Discord id an admin needs to remove one person. */
  entries: { userId: string; name: string; position: number }[];
}

export interface PromotionDue {
  rsn: string;
  rank: string;
  nextRank: string | null;
  points: number;
  since: string | null;
}

export interface TrackingGroupConfig {
  key: string;
  source: string;
  name: string;
  enabled: boolean;
  channels: { channelId: string; name: string | null }[];
}

export interface NewPoll {
  durationHours: number | null;
  title: string;
  options: string[];
  anonymous: boolean;
  multiple: boolean;
  channelId: string;
}

export interface NewSignup {
  type: "QUEUE" | "GROUP" | "SUBMISSION";
  title: string;
  note: string;
  max: number | null;
  signupChannelId: string;
  adminChannelId: string;
  fields: { label: string; type: "TEXT" | "LINK" | "IMAGE"; required: boolean }[];
}

export type SignupAdminAction = "pause" | "clear" | "remove" | "skip" | "removefirst" | "pick" | "delete";

export interface NewsChannelConfig {
  channelId: string;
  name: string | null;
  label: string | null;
  /** False if JonnyBot can no longer view the channel or read its history. */
  readable: boolean;
}

export interface ClanPoints {
  dailyMembershipPoints: number;
  citadelVisitPoints: number;
  citadelCapPoints: number;
  ranks: { id: string; name: string; order: number; threshold: number }[];
}

export interface TicketStats {
  open: number;
  closed: number;
  escalated: number;
  flagged: number;
  avgHoursToClose: number | null;
  avgMinutesToFirstHelper: number | null;
  byPanel: { panel: string; total: number; open: number }[];
  byWeek: { weekStart: string; opened: number }[];
  topHelpers: { id: string; name: string | null; tickets: number }[];
}

export interface TicketDetail extends TicketRow {
  helpers: { id: string; name: string | null }[];
  closedByName: string | null;
  transcript: string | null;
  transcriptMessageCount: number | null;
}

// ---------- plumbing ----------

// ---------- roster view, attention, health, audit, notes, scheduled posts ----------

export interface RosterMember {
  rsn: string;
  rank: string;
  rankOrder: number;
  points: number;
  promotionNeeded: boolean;
  verified: boolean;
  verificationMethod: string | null;
  verifiedAt: string | null;
  discordId: string | null;
  discordName: string | null;
  totalLevel: number | null;
  combatLevel: number | null;
  totalXp: number;
  kills: number;
  joinedAt: string | null;
  firstSeen: string | null;
  lastPolled: string | null;
  /** An estimate: the roster is refreshed once per cycle, so a member is due about one cycle after their last refresh. */
  nextPoll: string | null;
  lastActivity: string | null;
  visitedThisWeek: boolean;
  cappedThisWeek: boolean;
  notes: number;
}
export interface Roster {
  members: RosterMember[];
  pollCycleSeconds: number;
  autoPoll: boolean;
  weekStart: string;
  generatedAt: string;
}

export interface AttentionItem {
  rsn: string;
  detail: string;
}
export interface Attention {
  total: number;
  weekStart: string;
  unverified: AttentionItem[];
  stale: AttentionItem[];
  inactive: AttentionItem[];
  promotions: AttentionItem[];
  notCapped: AttentionItem[];
}

export interface BotHealth {
  uptimeSeconds: number;
  startedAt: string;
  memoryUsedMb: number;
  memoryMaxMb: number;
  discord: { status: string; gatewayPingMs: number; members: number };
  database: { ok: boolean; pingMs: number };
  environment: { live: boolean; siteUrlConfigured: boolean; autoPoll: boolean };
  polling: { rosterSize: number; refreshedRecently: number; stale: number; newestRefresh: string | null; cycleSeconds: number; rateLimitedQueue: number; delaySeconds: number };
  data: { newestActivity: string | null; firstSnapshot: string | null };
  scheduledPending: number;
}

export interface AuditEntry {
  id: number;
  actorId: string;
  actorName: string | null;
  method: string;
  path: string;
  status: number;
  at: string;
}

export interface MemberNote {
  id: number;
  rsn: string;
  note: string;
  authorId: string;
  authorName: string | null;
  at: string;
}

export interface ScheduledPost {
  id: number;
  channelId: string;
  channelName: string | null;
  text: string;
  convert: boolean;
  sendAt: string;
  status: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
  createdByName: string | null;
  createdAt: string;
  error: string | null;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; problems: string[] };

/** The bot couldn't be reached at all (not configured, down, or timed out) — distinct from it answering "no". */
export const UNREACHABLE: ApiResult<never> = {
  ok: false,
  status: 0,
  error: "JonnyBot isn't reachable right now.",
  problems: [],
};

async function request<T>(
  actorId: string | null,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const baseUrl = process.env.JONNYBOT_INTERNAL_API_URL;
  const secret = process.env.JONNYBOT_INTERNAL_API_SECRET;
  if (!baseUrl || !secret) return UNREACHABLE;

  const headers: Record<string, string> = { "X-Internal-Secret": secret };
  if (actorId) headers["X-Actor-Id"] = actorId;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/internal/admin/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store", // admin data must never be served from a cache
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return UNREACHABLE;
  }

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    // fall through with null
  }

  if (!response.ok) {
    const failure = (json ?? {}) as { error?: string; problems?: string[] };
    return { ok: false, status: response.status, error: failure.error ?? `Request failed (${response.status}).`, problems: failure.problems ?? [] };
  }
  return { ok: true, data: json as T };
}

/** Asks the bot who this Discord user is and whether they may use the dashboard. Used only by `requireAdmin()`. */
export function whoAmI(actorId: string): Promise<ApiResult<WhoAmI>> {
  return request<WhoAmI>(actorId, "GET", "whoami");
}

// ---------- the dashboard's calls (each needs a verified AdminContext) ----------

export const adminApi = {
  structure: (ctx: AdminContext) => request<GuildStructure>(ctx.actorId, "GET", "structure"),

  getSettings: (ctx: AdminContext) => request<TicketSettings>(ctx.actorId, "GET", "ticket/settings"),
  saveSettings: (ctx: AdminContext, settings: Omit<TicketSettings, "nextNumber">) =>
    request<TicketSettings>(ctx.actorId, "PUT", "ticket/settings", settings),

  listPanels: (ctx: AdminContext) => request<{ panels: PanelSummary[] }>(ctx.actorId, "GET", "ticket/panels"),
  getPanel: (ctx: AdminContext, id: string) => request<PanelDefinition>(ctx.actorId, "GET", `ticket/panels/${encodeURIComponent(id)}`),
  createPanel: (ctx: AdminContext, panel: PanelDefinition) => request<PanelDefinition>(ctx.actorId, "POST", "ticket/panels", panel),
  updatePanel: (ctx: AdminContext, id: string, panel: PanelDefinition) =>
    request<PanelDefinition>(ctx.actorId, "PUT", `ticket/panels/${encodeURIComponent(id)}`, panel),
  deletePanel: (ctx: AdminContext, id: string) => request<{ deleted: boolean }>(ctx.actorId, "DELETE", `ticket/panels/${encodeURIComponent(id)}`),
  postPanel: (ctx: AdminContext, id: string, channelId: string) =>
    request<PanelDefinition>(ctx.actorId, "POST", `ticket/panels/${encodeURIComponent(id)}/post`, { channelId }),

  helpSettings: (ctx: AdminContext) => request<HelpSettings>(ctx.actorId, "GET", "help/settings"),
  saveHelpSettings: (ctx: AdminContext, settings: Partial<Omit<HelpSettings, "guidelinesAreDefault" | "defaultGuidelines" | "postedChannelId">>) =>
    request<HelpSettings>(ctx.actorId, "PUT", "help/settings", settings),
  postHelpGuidelines: (ctx: AdminContext, channelId: string) => request<HelpSettings>(ctx.actorId, "POST", "help/guidelines/post", { channelId }),

  getPanelDefaults: (ctx: AdminContext) => request<PanelDefaults>(ctx.actorId, "GET", "ticket/defaults"),
  savePanelDefaults: (ctx: AdminContext, defaults: PanelDefaults) => request<PanelDefaults>(ctx.actorId, "PUT", "ticket/defaults", defaults),

  selfRoles: (ctx: AdminContext) => request<{ roles: SelfRoleConfig[] }>(ctx.actorId, "GET", "selfroles"),
  saveSelfRoles: (ctx: AdminContext, roles: { roleId: string; label: string; description: string }[]) =>
    request<{ roles: SelfRoleConfig[] }>(ctx.actorId, "PUT", "selfroles", { roles }),

  adminSignups: (ctx: AdminContext) => request<{ signups: AdminSignupSheet[] }>(ctx.actorId, "GET", "signups"),
  promotions: (ctx: AdminContext) => request<{ members: PromotionDue[] }>(ctx.actorId, "GET", "promotions"),
  markPromoted: (ctx: AdminContext, rsn: string) => request<{ members: PromotionDue[] }>(ctx.actorId, "POST", `promotions/${encodeURIComponent(rsn)}/done`, {}),
  tracking: (ctx: AdminContext) => request<{ groups: TrackingGroupConfig[] }>(ctx.actorId, "GET", "tracking"),
  saveTracking: (ctx: AdminContext, key: string, body: { enabled: boolean; channelIds: string[] }) =>
    request<{ groups: TrackingGroupConfig[] }>(ctx.actorId, "PUT", `tracking/${encodeURIComponent(key)}`, body),
  post: (ctx: AdminContext, body: { text: string; channelId?: string; convert: boolean; dryRun: boolean }) =>
    request<{ ok: boolean; posted: boolean; warnings: string[] }>(ctx.actorId, "POST", "post", body),
  community: (ctx: AdminContext) => request<{ pollChannelId: string | null; pollChannelName: string | null }>(ctx.actorId, "GET", "community"),
  saveCommunity: (ctx: AdminContext, pollChannelId: string | null) =>
    request<{ pollChannelId: string | null; pollChannelName: string | null }>(ctx.actorId, "PUT", "community", { pollChannelId }),
  createPoll: (ctx: AdminContext, poll: NewPoll) => request<{ created: boolean }>(ctx.actorId, "POST", "polls", poll),
  endPoll: (ctx: AdminContext, id: string) => request<{ ended: boolean }>(ctx.actorId, "POST", `polls/${encodeURIComponent(id)}/end`, {}),
  createSignup: (ctx: AdminContext, signup: NewSignup) => request<{ created: boolean }>(ctx.actorId, "POST", "signups", signup),
  signupAction: (ctx: AdminContext, id: string, action: SignupAdminAction, body: { userId?: string } = {}) =>
    request<{ done: boolean; paused?: boolean; winner?: string }>(ctx.actorId, "POST", `signups/${encodeURIComponent(id)}/${action}`, body),

  newsChannels: (ctx: AdminContext) => request<{ channels: NewsChannelConfig[] }>(ctx.actorId, "GET", "news"),
  saveNewsChannels: (ctx: AdminContext, channels: { channelId: string; label: string }[]) =>
    request<{ channels: NewsChannelConfig[] }>(ctx.actorId, "PUT", "news", { channels }),

  clanPoints: (ctx: AdminContext) => request<ClanPoints>(ctx.actorId, "GET", "clan/points"),
  saveClanPoints: (
    ctx: AdminContext,
    body: { dailyMembershipPoints: number; citadelVisitPoints: number; citadelCapPoints: number; ranks: { id: string; threshold: number }[] },
  ) => request<ClanPoints>(ctx.actorId, "PUT", "clan/points", body),

  clanWebsite: (ctx: AdminContext) => request<{ websiteUrl: string | null }>(ctx.actorId, "GET", "clan/website"),
  saveClanWebsite: (ctx: AdminContext, websiteUrl: string | null) => request<{ websiteUrl: string | null }>(ctx.actorId, "PUT", "clan/website", { websiteUrl }),
  siteOptions: (ctx: AdminContext) => request<{ navEventBubble: boolean }>(ctx.actorId, "GET", "site/options"),
  saveSiteOptions: (ctx: AdminContext, options: { navEventBubble: boolean }) => request<{ navEventBubble: boolean }>(ctx.actorId, "PUT", "site/options", options),
  roster: (ctx: AdminContext) => request<Roster>(ctx.actorId, "GET", "members"),
  attention: (ctx: AdminContext) => request<Attention>(ctx.actorId, "GET", "attention"),
  health: (ctx: AdminContext) => request<BotHealth>(ctx.actorId, "GET", "health"),
  audit: (ctx: AdminContext, query: { limit?: number; actor?: string; q?: string } = {}) => {
    const params = new URLSearchParams();
    if (query.limit) params.set("limit", String(query.limit));
    if (query.actor) params.set("actor", query.actor);
    if (query.q) params.set("q", query.q);
    return request<{ entries: AuditEntry[] }>(ctx.actorId, "GET", `audit?${params}`);
  },
  notes: (ctx: AdminContext, rsn: string) => request<{ notes: MemberNote[] }>(ctx.actorId, "GET", `notes?rsn=${encodeURIComponent(rsn)}`),
  addNote: (ctx: AdminContext, rsn: string, note: string) => request<{ notes: MemberNote[] }>(ctx.actorId, "POST", "notes", { rsn, note }),
  deleteNote: (ctx: AdminContext, id: number, rsn: string) => request<{ notes: MemberNote[] }>(ctx.actorId, "DELETE", `notes/${id}?rsn=${encodeURIComponent(rsn)}`),
  scheduled: (ctx: AdminContext) => request<{ posts: ScheduledPost[] }>(ctx.actorId, "GET", "scheduled"),
  schedulePost: (ctx: AdminContext, body: { text: string; channelId: string; convert: boolean; sendAt: string }) => request<{ ok: boolean; id: number }>(ctx.actorId, "POST", "scheduled", body),
  cancelScheduled: (ctx: AdminContext, id: number) => request<{ posts: ScheduledPost[] }>(ctx.actorId, "DELETE", `scheduled/${id}`),

  ticketStats: (ctx: AdminContext) => request<TicketStats>(ctx.actorId, "GET", "ticket/stats"),

  listTickets: (ctx: AdminContext, query: { status?: string; panel?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.panel) params.set("panel", query.panel);
    if (query.limit) params.set("limit", String(query.limit));
    if (query.offset) params.set("offset", String(query.offset));
    return request<{ tickets: TicketRow[]; hasMore: boolean }>(ctx.actorId, "GET", `ticket/tickets?${params}`);
  },
  getTicket: (ctx: AdminContext, id: string) => request<TicketDetail>(ctx.actorId, "GET", `ticket/tickets/${encodeURIComponent(id)}`),
};

/** A role's color as CSS, or undefined for the "no color" sentinel. */
export function discordColorCss(color: number): string | undefined {
  return color > 0 ? `#${color.toString(16).padStart(6, "0")}` : undefined;
}
