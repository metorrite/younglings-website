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

declare const guildContextBrand: unique symbol;

/**
 * Proof that the current request's user may manage one particular Discord server through the bot dashboard. Like
 * {@link AdminContext} it can only be made by `requireGuild()` in `lib/dashboard.ts`, which asks the bot about *that
 * server* on every call; every dashboard API call needs one, so a page can never be pointed at a server the user
 * hasn't been checked against.
 */
export interface GuildContext {
  readonly [guildContextBrand]: true;
  readonly actorId: string;
  readonly guildId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly tier: "ADMIN" | "DEVELOPER";
}

export function createGuildContext(guild: Omit<GuildContext, typeof guildContextBrand>): GuildContext {
  return guild as GuildContext;
}

/** A server the signed-in user may manage and JonnyBot is in. */
export interface ManagedGuild {
  id: string;
  name: string;
  iconUrl: string | null;
  memberCount: number;
  tier: "ADMIN" | "DEVELOPER";
}

// ---------- shapes the bot returns ----------

export interface WhoAmI {
  allowed: boolean;
  tier: "ADMIN" | "DEVELOPER" | "NONE";
  id?: string;
  displayName?: string;
  avatarUrl?: string;
  /** The server the answer is about; only present when the user is allowed in. */
  guildName?: string;
  guildIconUrl?: string | null;
}

export interface GuildRole {
  id: string;
  name: string;
  /** 0 when the role has no color. */
  color: number;
  managed: boolean;
  position: number;
}

export interface ForumInfo {
  id: string;
  name: string;
  category: string | null;
  canPost: boolean;
}

/** One post in a forum. JonnyBot posts in a thread, never in the forum itself, so the thread is what gets saved. */
export interface ForumThread {
  id: string;
  name: string;
  forumId: string;
  archived: boolean;
  canPost: boolean;
}

export interface GuildStructure {
  roles: GuildRole[];
  categories: { id: string; name: string }[];
  channels: { id: string; name: string; category: string | null; canPost: boolean }[];
  /** Sent by the bot since forum support; absent from an older bot. */
  forums?: ForumInfo[];
  threads?: ForumThread[];
}

/** The channels a picker offers: text and announcement channels, plus forums with their threads. Spread it onto a picker: `{...choicesOf(structure)}`. */
export interface ChannelChoices {
  channels: GuildStructure["channels"];
  forums: ForumInfo[];
  threads: ForumThread[];
}

export function choicesOf(structure: GuildStructure): ChannelChoices {
  return { channels: structure.channels, forums: structure.forums ?? [], threads: structure.threads ?? [] };
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

/** A PvM Help or CA Help ticket panel, as listed on the PvM Help page. */
export interface HelpPanelSummary {
  id: string;
  name: string;
  helpKind: HelpKind;
  categoryId: string | null;
  postedChannelId: string | null;
}

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
  /** The help panels that exist (PvM Help and CA Help). */
  panels: HelpPanelSummary[];
  /** Set only on the response to creating the standard panels: which were made and which were already there. */
  createdPanels?: string[];
  existingPanels?: string[];
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

export type WelcomeMessageType = "MESSAGE" | "EMBED" | "EMBED_TEXT";

export interface WelcomeField {
  name: string;
  value: string;
  inline: boolean;
}

/** The welcome message for new members. The server name, member count and icon only feed the editor's preview. */
export interface WelcomeConfig {
  enabled: boolean;
  messageType: WelcomeMessageType;
  channelId: string | null;
  channelName: string | null;
  alsoDm: boolean;
  content: string;
  /** 0xRRGGBB, or null for no colour bar. */
  color: number | null;
  title: string;
  titleUrl: string;
  description: string;
  authorName: string;
  authorIconUrl: string;
  thumbnailUrl: string;
  imageUrl: string;
  footerText: string;
  footerIconUrl: string;
  fields: WelcomeField[];
  linkButton: boolean;
  linkButtonLabel: string;
  serverName: string;
  memberCount: number;
  serverIconUrl: string | null;
}

/** What the browser may change; the preview-only fields come back from the bot but are never sent. */
export type WelcomeDraft = Omit<WelcomeConfig, "channelName" | "serverName" | "memberCount" | "serverIconUrl">;

/** A server's basic setup: the same settings as /configure in Discord. Ids are Discord ids as strings, null when unset. */
export interface ServerSetup {
  clanName: string | null;
  clanEnabled: boolean;
  clanActive: boolean;
  verificationReviewChannelId: string | null;
  renameAlertChannelId: string | null;
  verifiedClanRoleId: string | null;
  verifiedNonClanRoleId: string | null;
  unverifiedRoleId: string | null;
  onboardingRoleId: string | null;
}


/** A named set of server roles that works as one permission level. Admin, Support and Developer always exist; the rest are the server's own. */
export interface PermissionGroupConfig {
  key: string;
  name: string;
  builtin: boolean;
  /** Anyone holding a role ranked above the lowest of these counts too. */
  includeHigher: boolean;
  roleIds: string[];
}

export interface PermissionGroups {
  groups: PermissionGroupConfig[];
  maxCustomGroups: number;
  maxRolesPerGroup: number;
  maxNameLength: number;
}

/** What the editor sends: `key` is null for a group being created. */
export type PermissionGroupDraft = Omit<PermissionGroupConfig, "key" | "builtin"> & { key: string | null };

/** One slash command's card on the Hub. */
export interface HubCommandConfig {
  key: string;
  title: string;
  slashName: string;
  description: string;
  /** Plain English for who may use it when nothing has been changed. */
  defaultAccess: string;
  enabled: boolean;
  /** false: the command's own rule. true: only admins plus {@link allowedRefs}. */
  customAccess: boolean;
  /** `group:<key>` or `role:<id>`. */
  allowedRefs: string[];
  /** Where members may use it; empty means anywhere. */
  channelIds: string[];
  /** Only the Signups card has these. */
  signup?: { adminChannelId: string | null; lockAdminChannel: boolean; publicChannelIds: string[] };
}

export interface HubConfig {
  commands: HubCommandConfig[];
  /** The permission groups a "who can use it" list can name. */
  groups: { ref: string; name: string; builtin: boolean }[];
  maxList: number;
}

/** What a card sends on save (the fields it doesn't send keep their value). */
export type HubCommandDraft = Pick<HubCommandConfig, "enabled" | "customAccess" | "allowedRefs" | "channelIds" | "signup">;

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

/** What a welcome Server Action answers, for both the clan admin console and the bot dashboard. */
export type WelcomeActionResult<T> = { ok: true; data: T } | { ok: false; error: string; problems: string[] };

async function request<T>(
  actorId: string | null,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  /** The Discord server the call is about. Left out, it is the bot's home server, which is what the clan's own admin console wants. */
  guildId?: string,
): Promise<ApiResult<T>> {
  const baseUrl = process.env.JONNYBOT_INTERNAL_API_URL;
  const secret = process.env.JONNYBOT_INTERNAL_API_SECRET;
  if (!baseUrl || !secret) return UNREACHABLE;

  const headers: Record<string, string> = { "X-Internal-Secret": secret };
  if (actorId) headers["X-Actor-Id"] = actorId;
  if (guildId) headers["X-Guild-Id"] = guildId;
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

/** Either kind of verified user: the clan console's admin (always the home server) or a dashboard user checked against one server. */
export type ApiContext = AdminContext | GuildContext;

/** One admin call made for a verified user; a {@link GuildContext} also names the server it is about. */
function call<T>(ctx: ApiContext, method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<ApiResult<T>> {
  return request<T>(ctx.actorId, method, path, body, "guildId" in ctx ? ctx.guildId : undefined);
}

/** Asks the bot who this Discord user is and whether they may use the dashboard. Used only by `requireAdmin()`. */
export function whoAmI(actorId: string, guildId?: string): Promise<ApiResult<WhoAmI>> {
  return request<WhoAmI>(actorId, "GET", "whoami", undefined, guildId);
}

// ---------- the bot dashboard's calls (each needs a GuildContext, or just the verified user for the server list) ----------

export const dashboardApi = {
  /** The servers this user may manage where JonnyBot is installed. */
  guilds: (actorId: string) => request<{ guilds: ManagedGuild[] }>(actorId, "GET", "guilds"),

  structure: (g: GuildContext) => request<GuildStructure>(g.actorId, "GET", "structure", undefined, g.guildId),

  welcome: (g: GuildContext) => request<WelcomeConfig>(g.actorId, "GET", "welcome", undefined, g.guildId),
  saveWelcome: (g: GuildContext, draft: WelcomeDraft) => request<WelcomeConfig>(g.actorId, "PUT", "welcome", draft, g.guildId),
  testWelcome: (g: GuildContext, draft: WelcomeDraft) =>
    request<{ sent: boolean; channelName: string; dmSent: boolean }>(g.actorId, "POST", "welcome/test", draft, g.guildId),
};

// ---------- the dashboard's calls (each needs a verified AdminContext) ----------

export const adminApi = {
  structure: (ctx: ApiContext) => call<GuildStructure>(ctx, "GET", "structure"),

  getSettings: (ctx: ApiContext) => call<TicketSettings>(ctx, "GET", "ticket/settings"),
  saveSettings: (ctx: ApiContext, settings: Omit<TicketSettings, "nextNumber">) =>
    call<TicketSettings>(ctx, "PUT", "ticket/settings", settings),

  listPanels: (ctx: ApiContext) => call<{ panels: PanelSummary[] }>(ctx, "GET", "ticket/panels"),
  getPanel: (ctx: ApiContext, id: string) => call<PanelDefinition>(ctx, "GET", `ticket/panels/${encodeURIComponent(id)}`),
  createPanel: (ctx: ApiContext, panel: PanelDefinition) => call<PanelDefinition>(ctx, "POST", "ticket/panels", panel),
  updatePanel: (ctx: ApiContext, id: string, panel: PanelDefinition) =>
    call<PanelDefinition>(ctx, "PUT", `ticket/panels/${encodeURIComponent(id)}`, panel),
  deletePanel: (ctx: ApiContext, id: string) => call<{ deleted: boolean }>(ctx, "DELETE", `ticket/panels/${encodeURIComponent(id)}`),
  postPanel: (ctx: ApiContext, id: string, channelId: string) =>
    call<PanelDefinition>(ctx, "POST", `ticket/panels/${encodeURIComponent(id)}/post`, { channelId }),

  helpSettings: (ctx: ApiContext) => call<HelpSettings>(ctx, "GET", "help/settings"),
  saveHelpSettings: (ctx: ApiContext, settings: Partial<Omit<HelpSettings, "guidelinesAreDefault" | "defaultGuidelines" | "postedChannelId" | "panels" | "createdPanels" | "existingPanels">>) =>
    call<HelpSettings>(ctx, "PUT", "help/settings", settings),
  createHelpPanels: (ctx: ApiContext) => call<HelpSettings>(ctx, "POST", "help/panels", {}),
  postHelpGuidelines: (ctx: ApiContext, channelId: string) => call<HelpSettings>(ctx, "POST", "help/guidelines/post", { channelId }),

  hub: (ctx: ApiContext) => call<HubConfig>(ctx, "GET", "hub"),
  saveHubCommand: (ctx: ApiContext, key: string, draft: Partial<HubCommandDraft>) => call<HubCommandConfig>(ctx, "PUT", `hub/${encodeURIComponent(key)}`, draft),

  permissions: (ctx: ApiContext) => call<PermissionGroups>(ctx, "GET", "permissions"),
  savePermissions: (ctx: ApiContext, groups: PermissionGroupDraft[]) => call<PermissionGroups>(ctx, "PUT", "permissions", { groups }),

  serverSetup: (ctx: ApiContext) => call<ServerSetup>(ctx, "GET", "setup"),
  saveServerSetup: (ctx: ApiContext, setup: ServerSetup) => call<ServerSetup>(ctx, "PUT", "setup", setup),

  welcome: (ctx: ApiContext) => call<WelcomeConfig>(ctx, "GET", "welcome"),
  saveWelcome: (ctx: ApiContext, draft: WelcomeDraft) => call<WelcomeConfig>(ctx, "PUT", "welcome", draft),
  testWelcome: (ctx: ApiContext, draft: WelcomeDraft) =>
    call<{ sent: boolean; channelName: string; dmSent: boolean }>(ctx, "POST", "welcome/test", draft),

  getPanelDefaults: (ctx: ApiContext) => call<PanelDefaults>(ctx, "GET", "ticket/defaults"),
  savePanelDefaults: (ctx: ApiContext, defaults: PanelDefaults) => call<PanelDefaults>(ctx, "PUT", "ticket/defaults", defaults),

  selfRoles: (ctx: ApiContext) => call<{ roles: SelfRoleConfig[] }>(ctx, "GET", "selfroles"),
  saveSelfRoles: (ctx: ApiContext, roles: { roleId: string; label: string; description: string }[]) =>
    call<{ roles: SelfRoleConfig[] }>(ctx, "PUT", "selfroles", { roles }),

  adminSignups: (ctx: ApiContext) => call<{ signups: AdminSignupSheet[] }>(ctx, "GET", "signups"),
  promotions: (ctx: ApiContext) => call<{ members: PromotionDue[] }>(ctx, "GET", "promotions"),
  markPromoted: (ctx: ApiContext, rsn: string) => call<{ members: PromotionDue[] }>(ctx, "POST", `promotions/${encodeURIComponent(rsn)}/done`, {}),
  tracking: (ctx: ApiContext) => call<{ groups: TrackingGroupConfig[] }>(ctx, "GET", "tracking"),
  saveTracking: (ctx: ApiContext, key: string, body: { enabled: boolean; channelIds: string[] }) =>
    call<{ groups: TrackingGroupConfig[] }>(ctx, "PUT", `tracking/${encodeURIComponent(key)}`, body),
  post: (ctx: ApiContext, body: { text: string; channelId?: string; convert: boolean; dryRun: boolean }) =>
    call<{ ok: boolean; posted: boolean; warnings: string[] }>(ctx, "POST", "post", body),
  community: (ctx: ApiContext) => call<{ pollChannelId: string | null; pollChannelName: string | null }>(ctx, "GET", "community"),
  saveCommunity: (ctx: ApiContext, pollChannelId: string | null) =>
    call<{ pollChannelId: string | null; pollChannelName: string | null }>(ctx, "PUT", "community", { pollChannelId }),
  createPoll: (ctx: ApiContext, poll: NewPoll) => call<{ created: boolean }>(ctx, "POST", "polls", poll),
  endPoll: (ctx: ApiContext, id: string) => call<{ ended: boolean }>(ctx, "POST", `polls/${encodeURIComponent(id)}/end`, {}),
  createSignup: (ctx: ApiContext, signup: NewSignup) => call<{ created: boolean }>(ctx, "POST", "signups", signup),
  signupAction: (ctx: ApiContext, id: string, action: SignupAdminAction, body: { userId?: string } = {}) =>
    call<{ done: boolean; paused?: boolean; winner?: string }>(ctx, "POST", `signups/${encodeURIComponent(id)}/${action}`, body),

  newsChannels: (ctx: ApiContext) => call<{ channels: NewsChannelConfig[] }>(ctx, "GET", "news"),
  saveNewsChannels: (ctx: ApiContext, channels: { channelId: string; label: string }[]) =>
    call<{ channels: NewsChannelConfig[] }>(ctx, "PUT", "news", { channels }),

  clanPoints: (ctx: ApiContext) => call<ClanPoints>(ctx, "GET", "clan/points"),
  saveClanPoints: (
    ctx: ApiContext,
    body: { dailyMembershipPoints: number; citadelVisitPoints: number; citadelCapPoints: number; ranks: { id: string; threshold: number }[] },
  ) => call<ClanPoints>(ctx, "PUT", "clan/points", body),

  clanWebsite: (ctx: ApiContext) => call<{ websiteUrl: string | null }>(ctx, "GET", "clan/website"),
  saveClanWebsite: (ctx: ApiContext, websiteUrl: string | null) => call<{ websiteUrl: string | null }>(ctx, "PUT", "clan/website", { websiteUrl }),
  siteOptions: (ctx: ApiContext) => call<{ navEventBubble: boolean }>(ctx, "GET", "site/options"),
  saveSiteOptions: (ctx: ApiContext, options: { navEventBubble: boolean }) => call<{ navEventBubble: boolean }>(ctx, "PUT", "site/options", options),
  roster: (ctx: ApiContext) => call<Roster>(ctx, "GET", "members"),
  attention: (ctx: ApiContext) => call<Attention>(ctx, "GET", "attention"),
  health: (ctx: ApiContext) => call<BotHealth>(ctx, "GET", "health"),
  audit: (ctx: ApiContext, query: { limit?: number; actor?: string; q?: string } = {}) => {
    const params = new URLSearchParams();
    if (query.limit) params.set("limit", String(query.limit));
    if (query.actor) params.set("actor", query.actor);
    if (query.q) params.set("q", query.q);
    return call<{ entries: AuditEntry[] }>(ctx, "GET", `audit?${params}`);
  },
  notes: (ctx: ApiContext, rsn: string) => call<{ notes: MemberNote[] }>(ctx, "GET", `notes?rsn=${encodeURIComponent(rsn)}`),
  addNote: (ctx: ApiContext, rsn: string, note: string) => call<{ notes: MemberNote[] }>(ctx, "POST", "notes", { rsn, note }),
  deleteNote: (ctx: ApiContext, id: number, rsn: string) => call<{ notes: MemberNote[] }>(ctx, "DELETE", `notes/${id}?rsn=${encodeURIComponent(rsn)}`),
  scheduled: (ctx: ApiContext) => call<{ posts: ScheduledPost[] }>(ctx, "GET", "scheduled"),
  schedulePost: (ctx: ApiContext, body: { text: string; channelId: string; convert: boolean; sendAt: string }) => call<{ ok: boolean; id: number }>(ctx, "POST", "scheduled", body),
  cancelScheduled: (ctx: ApiContext, id: number) => call<{ posts: ScheduledPost[] }>(ctx, "DELETE", `scheduled/${id}`),

  ticketStats: (ctx: ApiContext) => call<TicketStats>(ctx, "GET", "ticket/stats"),

  listTickets: (ctx: ApiContext, query: { status?: string; panel?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.panel) params.set("panel", query.panel);
    if (query.limit) params.set("limit", String(query.limit));
    if (query.offset) params.set("offset", String(query.offset));
    return call<{ tickets: TicketRow[]; hasMore: boolean }>(ctx, "GET", `ticket/tickets?${params}`);
  },
  getTicket: (ctx: ApiContext, id: string) => call<TicketDetail>(ctx, "GET", `ticket/tickets/${encodeURIComponent(id)}`),
};

/** A role's color as CSS, or undefined for the "no color" sentinel. */
export function discordColorCss(color: number): string | undefined {
  return color > 0 ? `#${color.toString(16).padStart(6, "0")}` : undefined;
}
