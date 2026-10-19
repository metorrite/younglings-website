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
  /** Whether the person may use JonnyBot's website while it is closed: the clan's admins, or admins of a trusted beta server. Absent from an older bot. */
  beta?: boolean;
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
  /** Close a ticket this many days after its last message (warned a day before); null = never. */
  autoCloseDays: number | null;
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

export interface BotNotice {
  id: string;
  severity: "info" | "warning" | "issue";
  body: string;
  createdAt: string;
}

/** What the dashboard's Overview shows for one server, in one call. */
export interface Overview {
  members: { rosterSize: number; linked: number; unverified: number; stale: number; inactive: number; promotionsDue: number; discordMembers: number };
  community: { openSignups: number; openPolls: number };
  /** Absent for a server that has never used tickets. */
  tickets?: { open: number; escalated: number; flagged: number };
  health: { ok: boolean; problems: string[]; uptimeSeconds: number; autoPoll: boolean };
  notices: BotNotice[];
  /** Whether the person asking owns the bot itself (not just this server), and so may post notices. */
  isOwner: boolean;
}

/** A trusted server whose admin team may use JonnyBot's website while it is closed to everyone else. */
export interface BetaGuild {
  guildId: string;
  label: string;
  /** Whether the bot is in that server; it has to be, to check who holds Manage Server there. */
  botPresent: boolean;
  name: string | null;
}

export interface BetaGuilds {
  guilds: BetaGuild[];
  /** Only the bot's owner may change the list. */
  canEdit: boolean;
}

/** One line of a server's checkup: something fine, something worth a look, or something broken. */
export interface CheckupFinding {
  level: "OK" | "WARN" | "ERROR";
  area: string;
  title: string;
  detail: string | null;
  /** The dashboard page that fixes it, under /dashboard/<server>. */
  page: string | null;
}

export interface Checkup {
  findings: CheckupFinding[];
  errors: number;
  warnings: number;
  ok: number;
}

/** A server's autoroles: roles handed to everyone who joins (a separate list for bots), after an optional delay. */
export interface Autoroles {
  enabled: boolean;
  delaySeconds: number;
  memberRoleIds: string[];
  botRoleIds: string[];
  maxRoles: number;
  maxDelaySeconds: number;
  /** Chosen roles that can't be given out right now (deleted, above the bot, too powerful). */
  issues: string[];
}

/** One button on a role panel: the role it gives, the words on it, an optional emoji, and its colour. */
export interface RolePanelButton {
  roleId: string;
  label: string;
  emoji: string | null;
  style: "primary" | "secondary" | "success" | "danger";
}

/** A message of buttons members press to take or drop a role. */
export interface RolePanelDef {
  id: string | null;
  name: string;
  title: string;
  description: string;
  color: number | null;
  mode: "TOGGLE" | "UNIQUE";
  posted: boolean;
  channelId: string | null;
  messageId: string | null;
  buttons: RolePanelButton[];
}

export interface RolePanelSummary {
  id: string;
  name: string;
  title: string;
  mode: "TOGGLE" | "UNIQUE";
  buttonCount: number;
  posted: boolean;
  channelId: string | null;
  channelName: string | null;
}

export interface RolePanelList {
  panels: RolePanelSummary[];
  maxPanels: number;
  maxButtons: number;
}

/** A server's goodbye message: a line posted when someone leaves. */
export interface Goodbye {
  enabled: boolean;
  channelId: string | null;
  content: string;
  maxContent: number;
  serverName: string;
  memberCount: number;
}

/** How JonnyBot appears in one server: the name its messages use, and its own nickname there. */
export interface BotBranding {
  /** The display name the server chose, or null when it uses the clan or server name. */
  displayName: string | null;
  clanName: string | null;
  serverName: string;
  /** What messages call the server right now. */
  effectiveName: string;
  /** The bot's nickname in this server, or null for its normal name. */
  nickname: string | null;
  botName: string;
  canChangeNickname: boolean;
  /** Whether the server is on the premium list (avatar, banner and bio are for those servers). */
  premium: boolean;
  maxDisplayName: number;
  maxNickname: number;
}

/** A server's starboard: messages with enough of one reaction are copied to a showcase channel. */
export interface Starboard {
  enabled: boolean;
  channelId: string | null;
  emoji: string;
  threshold: number;
  selfStar: boolean;
  maxThreshold: number;
}

/** One automatic reply: when a message matches the trigger, the bot answers. */
export interface AutoReplyDef {
  id: string | null;
  trigger: string;
  match: "WORD" | "STARTS" | "EXACT";
  reply: string;
  cooldownSeconds: number;
  enabled: boolean;
}

export interface AutoReplyList {
  replies: AutoReplyDef[];
  max: number;
  maxTrigger: number;
  maxReply: number;
  minCooldown: number;
  maxCooldown: number;
}

/** A giveaway as the dashboard lists it. */
export interface GiveawayItem {
  id: string;
  prize: string;
  status: "OPEN" | "ENDED";
  channelId: string;
  channelName: string | null;
  winnerCount: number;
  endsAt: string;
  entries: number;
  requiredRoleId: string | null;
  winners: string[];
}

export interface GiveawayList {
  giveaways: GiveawayItem[];
  maxWinners: number;
  maxPrize: number;
}

export interface GiveawayStart {
  prize: string;
  channelId: string;
  durationMinutes: number;
  winners: number;
  requiredRoleId: string | null;
}

/** A suggestion as the dashboard lists it. */
export interface SuggestionItem {
  id: string;
  authorId: string;
  authorName: string | null;
  content: string;
  status: "PENDING" | "APPROVED" | "DENIED" | "IMPLEMENTED";
  note: string | null;
  decidedBy: string | null;
  ups: number;
  downs: number;
  createdAt: string;
}

export interface SuggestionList {
  channelId: string | null;
  suggestions: SuggestionItem[];
  maxNote: number;
}

/** One channel's auto-clean rule. `problem` says why it is not working, when it is not. */
export interface AutoCleanRule {
  channelId: string;
  channelName: string | null;
  maxAgeMinutes: number;
  keepPinned: boolean;
  problem: string | null;
}

export interface AutoCleanList {
  rules: AutoCleanRule[];
  minAge: number;
  maxAge: number;
  maxRules: number;
}

/** A warning given with /warn. Names are null when the person has left the server. */
export interface WarningItem {
  id: string;
  userId: string;
  userName: string | null;
  moderatorId: string;
  moderatorName: string | null;
  reason: string;
  createdAt: string;
}

export interface WarningList {
  warnings: WarningItem[];
  limit: number;
}

/** A server's points: whether they are on, what they are called, the leaderboard, the newest ledger entries and the totals. */
export interface PointsOverview {
  enabled: boolean;
  unit: string;
  /** Where members' screenshots are sent for review; null until an admin picks one. */
  reviewChannelId: string | null;
  top: { userId: string; userName: string | null; points: number }[];
  recent: {
    id: string;
    userId: string;
    userName: string | null;
    points: number;
    reason: string;
    category: string;
    awardedBy: string | null;
    awardedByName: string | null;
    createdAt: string;
  }[];
  totals: { members: number; outstanding: number; awarded: number; spent: number };
  maxPerEntry: number;
}

/** One points submission: a member's screenshot waiting for staff, or already decided. `proofUrl` is a fresh link to the image. */
export interface PointsSubmission {
  id: string;
  userId: string;
  userName: string | null;
  description: string;
  proofUrl: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  decidedByName: string | null;
  decisionNote: string | null;
  pointsAwarded: number | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface PointsSubmissions {
  pending: PointsSubmission[];
  decided: PointsSubmission[];
  maxPerEntry: number;
}

/** A reward members can spend points on. `stock` is null for unlimited; an archived reward (`active` false) is hidden from members. */
export interface PointsReward {
  id: string;
  name: string;
  description: string;
  cost: number;
  stock: number | null;
  active: boolean;
}

export interface PointsRewards {
  rewards: PointsReward[];
  maxRewards: number;
  maxPerEntry: number;
}

export interface PointsRedemption {
  id: string;
  rewardName: string;
  userId: string;
  userName: string | null;
  cost: number;
  status: "PENDING" | "FULFILLED" | "CANCELLED";
  handledByName: string | null;
  createdAt: string;
  handledAt: string | null;
}

export interface PointsRedemptions {
  pending: PointsRedemption[];
  handled: PointsRedemption[];
}

/** One automod rule. `limit` and `seconds` mean different things per rule (the form labels them); `words` is the blocked words, or the allowed websites for links. */
export interface AutomodRule {
  key: "INVITES" | "LINKS" | "BLOCKED_WORDS" | "CAPS" | "MENTIONS" | "SPAM" | "REPEAT" | "EMOJI";
  label: string;
  enabled: boolean;
  warn: boolean;
  limit: number;
  seconds: number;
  words: string[];
}

/** A server's automod: which rules are on, what they allow, and who is never checked. `canDelete` says whether JonnyBot may delete messages. */
export interface Automod {
  enabled: boolean;
  rules: AutomodRule[];
  exemptRoles: string[];
  exemptChannels: string[];
  canDelete: boolean;
  maxWords: number;
  maxDomains: number;
}

/** The moderation log: bans, unbans and timeouts written to a channel. `canReadAuditLog` says whether entries can name who acted. */
export interface ModLog {
  enabled: boolean;
  channelId: string | null;
  logBans: boolean;
  logTimeouts: boolean;
  canReadAuditLog: boolean;
}

/** The new-account gate: what happens to an account younger than `minAgeDays` when it joins. `canKick` says whether JonnyBot may remove them. */
export interface AccountGate {
  enabled: boolean;
  minAgeDays: number;
  action: "ALERT" | "KICK";
  alertChannelId: string | null;
  maxAgeDays: number;
  canKick: boolean;
}

/** One autopunish rule: at exactly `threshold` warnings, do `action` (a timeout lasts `timeoutMinutes`). */
export interface AutopunishRule {
  threshold: number;
  action: "TIMEOUT" | "KICK" | "BAN";
  timeoutMinutes: number;
}

export interface Autopunish {
  rules: AutopunishRule[];
  maxRules: number;
  maxThreshold: number;
  maxTimeoutMinutes: number;
  canTimeout: boolean;
  canKick: boolean;
  canBan: boolean;
}

/** One channel's auto-delete rule. `problem` says why it is not working, when it is not. */
export interface AutoDeleteRule {
  channelId: string;
  channelName: string | null;
  filters: string[];
  problem: string | null;
}

export interface AutoDeleteList {
  rules: AutoDeleteRule[];
  available: { key: string; label: string }[];
  maxRules: number;
}

/** A server's clan profile: what it shares publicly, and the read-only facts about verification and listing. */
export interface ClanProfileData {
  visibility: "PRIVATE" | "UNLISTED" | "PUBLIC";
  slug: string | null;
  displayName: string;
  tagline: string;
  description: string;
  logoUrl: string | null;
  colour: number | null;
  timezone: string | null;
  focus: string[];
  recruiting: "CLOSED" | "OPEN" | "INVITE_ONLY";
  requirements: string;
  applyUrl: string | null;
  leaderboardOptIn: boolean;
  currentClanName: string | null;
  verified: boolean;
  verifiedClanName: string | null;
  listing: "HIDDEN" | "UNLISTED" | "LISTED";
  suspended: boolean;
  suspendedReason: string | null;
  memberCount: number;
  suggestedName: string;
  options: { visibility: { key: string; label: string }[]; recruiting: { key: string; label: string }[]; focus: { key: string; label: string }[] };
  limits: { name: number; tagline: number; description: number; requirements: number };
}

/** The bot owner's view of the clan directory. Everyone else gets `canEdit: false` and empty lists. */
export interface ClanListings {
  canEdit: boolean;
  listings: {
    guildId: string;
    serverName: string | null;
    slug: string | null;
    displayName: string;
    visibility: string;
    listing: "HIDDEN" | "UNLISTED" | "LISTED";
    verified: boolean;
    suspended: boolean;
    suspendedReason: string | null;
    openReports: number;
  }[];
  reports: { id: string; guildId: string; slug: string | null; displayName: string | null; reason: string; reporter: string | null; createdAt: string }[];
}

/** The server's upcoming Discord events and whether each is shown publicly. `listing` says whether sharing would actually show them. */
export interface ClanEvents {
  events: { id: string; name: string; location: string | null; status: string; startTime: string; endTime: string | null; shared: boolean; scope: "NONE" | "ALLIANCE" | "PUBLIC" }[];
  listing: "HIDDEN" | "UNLISTED" | "LISTED";
  slug: string | null;
}

/** This server's alliances and invitations. `status` is this server's own: INVITED (not answered yet) or ACTIVE. */
export interface Alliance {
  id: string;
  name: string;
  status: "INVITED" | "ACTIVE";
  founder: boolean;
  members: { guildId: string; name: string; slug: string | null; status: "INVITED" | "ACTIVE"; founder: boolean; you: boolean }[];
}

export interface AllianceList {
  alliances: Alliance[];
  maxPerServer: number;
  maxMembers: number;
}

/** An alliance's shared calendar: events its active clans share with allies (or with everyone), soonest first. */
export interface AllianceEvents {
  events: {
    id: string;
    name: string;
    location: string | null;
    status: string;
    startTime: string;
    endTime: string | null;
    url: string;
    clan: string;
    yours: boolean;
    scope: "ALLIANCE" | "PUBLIC";
  }[];
}

/** How much of a clan reports through the plugin: counts only, never who. */
export interface PluginCoverage {
  rosterSize: number;
  linkedPlayers: number;
  withToken: number;
  reportingRecently: number;
  recentDays: number;
  consent: { key: string; label: string; players: number }[];
}

/** The servers on the faster polling plan. Only the bot's owner gets the list; everyone else just learns about their own server. */
export interface PremiumGuilds {
  guilds: BetaGuild[];
  canEdit: boolean;
  /** Whether the server the question was asked about is on the plan. */
  thisServer: boolean;
}

export interface PollJobStatus {
  name: string;
  priority: string;
  periodSeconds: number;
  spreadSeconds: number;
  lastRunAt: string | null;
  lastSubmitted: number;
}

/** The bot's poll coordinator: what is waiting for a RuneMetrics request, how fast it may go, and what it has saved. */
export interface PollQueueStatus {
  queued: number;
  queuedByPriority: Record<string, number>;
  inFlight: string | null;
  oldestWaitingSeconds: number;
  requestBudget: number;
  burst: number;
  secondsPerRequest: number;
  slowdown: number;
  requestsLastMinute: number;
  requestsLast10Minutes: number;
  polled: number;
  skippedAsRecent: number;
  mergedDuplicates: number;
  rateLimited: number;
  gaveUp: number;
  failed: number;
  jobs: PollJobStatus[];
}

export interface BotHealth {
  uptimeSeconds: number;
  startedAt: string;
  memoryUsedMb: number;
  memoryMaxMb: number;
  discord: { status: string; gatewayPingMs: number; members: number };
  database: { ok: boolean; pingMs: number };
  environment: { live: boolean; siteUrlConfigured: boolean; autoPoll: boolean };
  polling: { rosterSize: number; refreshedRecently: number; stale: number; newestRefresh: string | null; cycleSeconds: number; rateLimitedQueue: number; delaySeconds: number; queue?: PollQueueStatus };
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

/** CONTAINER is a newer kind of message built from blocks, which is what lets the link button sit inside it. */
export type WelcomeMessageType = "MESSAGE" | "EMBED" | "EMBED_TEXT" | "CONTAINER";
export type LinkButtonStyle = "primary" | "secondary" | "success" | "danger";
/** How a container shows its footer: small and grey like an embed's, as bright as the rest of the text, or bold. */
export type FooterStyle = "small" | "normal" | "bold";

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
  linkButtonStyle: LinkButtonStyle;
  footerStyle: FooterStyle;
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

/** A picture a server uploaded, by its token, or null if there isn't one (or the bot can't be reached). For the public route that serves it to Discord. */
export async function fetchUploadedImage(token: string): Promise<{ contentType: string; data: ArrayBuffer } | null> {
  const baseUrl = process.env.JONNYBOT_INTERNAL_API_URL;
  const secret = process.env.JONNYBOT_INTERNAL_API_SECRET;
  if (!baseUrl || !secret) return null;

  try {
    const response = await fetch(`${baseUrl}/internal/image/${token}`, { headers: { "X-Internal-Secret": secret }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return null;
    return { contentType: response.headers.get("content-type") ?? "application/octet-stream", data: await response.arrayBuffer() };
  } catch {
    return null;
  }
}

/** A locked week's wheel GIF by its token, or null. For the public route that serves it, which is what makes it show inside a Discord message. */
export async function fetchWheelGif(token: string): Promise<ArrayBuffer | null> {
  const baseUrl = process.env.JONNYBOT_INTERNAL_API_URL;
  const secret = process.env.JONNYBOT_INTERNAL_API_SECRET;
  if (!baseUrl || !secret) return null;

  try {
    const response = await fetch(`${baseUrl}/internal/wheel-gif/${token}`, { headers: { "X-Internal-Secret": secret }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
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

  /** Stores a picture for one place in the welcome embed, replacing the one there. */
  uploadWelcomeImage: (g: GuildContext, slot: string, base64: string) =>
    request<{ token: string; version: number }>(g.actorId, "PUT", `images/welcome/${encodeURIComponent(slot)}`, { data: base64 }, g.guildId),
  removeWelcomeImage: (g: GuildContext, slot: string) => request<{ removed: boolean }>(g.actorId, "DELETE", `images/welcome/${encodeURIComponent(slot)}`, undefined, g.guildId),
};

// ---------- the dashboard's calls (each needs a verified AdminContext) ----------

export const adminApi = {
  uploadWelcomeImage: (ctx: ApiContext, slot: string, base64: string) =>
    call<{ token: string; version: number }>(ctx, "PUT", `images/welcome/${encodeURIComponent(slot)}`, { data: base64 }),
  removeWelcomeImage: (ctx: ApiContext, slot: string) => call<{ removed: boolean }>(ctx, "DELETE", `images/welcome/${encodeURIComponent(slot)}`),

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
  overview: (ctx: ApiContext) => call<Overview>(ctx, "GET", "overview"),
  suggestions: (ctx: ApiContext) => call<SuggestionList>(ctx, "GET", "suggestions"),
  saveSuggestionChannel: (ctx: ApiContext, channelId: string | null) => call<SuggestionList>(ctx, "PUT", "suggestions/settings", { channelId }),
  decideSuggestion: (ctx: ApiContext, id: string, status: string, note: string) =>
    call<SuggestionList>(ctx, "POST", `suggestions/${encodeURIComponent(id)}/decide`, { status, note }),
  deleteSuggestion: (ctx: ApiContext, id: string) => call<SuggestionList>(ctx, "DELETE", `suggestions/${encodeURIComponent(id)}`),
  autoClean: (ctx: ApiContext) => call<AutoCleanList>(ctx, "GET", "autopurge"),
  saveAutoClean: (ctx: ApiContext, channelId: string, maxAgeMinutes: number, keepPinned: boolean) =>
    call<AutoCleanList>(ctx, "PUT", "autopurge", { channelId, maxAgeMinutes, keepPinned }),
  deleteAutoClean: (ctx: ApiContext, channelId: string) => call<AutoCleanList>(ctx, "DELETE", `autopurge/${encodeURIComponent(channelId)}`),
  /** Who capped at the Clan Citadel in the week that ended on `end` (a Wednesday), or the week that just finished. */
  citadelCappers: (ctx: ApiContext, end: string | null) => call<import("./citadelTypes").CitadelCappers>(ctx, "GET", end ? `citadel/cappers/${encodeURIComponent(end)}` : "citadel/cappers"),
  /** The settings for announcing the Citadel wheel's winner (auto-post, channel, message). */
  citadelWheel: (ctx: ApiContext) => call<import("./citadelTypes").WheelSettings>(ctx, "GET", "citadel/wheel"),
  saveCitadelWheel: (ctx: ApiContext, body: { autoPost: boolean; channelId: string | null; message: string }) =>
    call<import("./citadelTypes").WheelSettings>(ctx, "PUT", "citadel/wheel", body),
  /** Announces a winner the dashboard's wheel picked, in the channel the server chose. `entries` is every entry on the wheel (a name once per entry). */
  citadelPost: (ctx: ApiContext, body: { winner: string; entries: string[]; end: string }) =>
    call<{ queued: boolean; channel: string }>(ctx, "POST", "citadel/post", body),
  /** The locked winners (newest first), one week's winner with its announcement text, and locking, unlocking and posting one. */
  citadelWinners: (ctx: ApiContext) => call<{ weeks: import("./citadelTypes").WheelWeek[] }>(ctx, "GET", "citadel/winners"),
  citadelWinner: (ctx: ApiContext, end: string) => call<import("./citadelTypes").WheelWeek>(ctx, "GET", `citadel/winners/${encodeURIComponent(end)}`),
  /** Locks the next place of a week. Answers with the whole week so far. */
  citadelLock: (ctx: ApiContext, body: { end: string; winner: string; entries: string[]; manual: boolean; gif?: string }) =>
    call<import("./citadelTypes").WheelWeek>(ctx, "POST", "citadel/lock", body),
  citadelUnlock: (ctx: ApiContext, end: string) => call<{ weeks: import("./citadelTypes").WheelWeek[] }>(ctx, "POST", "citadel/unlock", { end }),
  /** Marks a winner's prize given by hand, or back to not given. */
  citadelPrize: (ctx: ApiContext, body: { end: string; place: number; action: "given" | "pending"; amount?: string; note?: string }) =>
    call<import("./citadelTypes").WheelWeek>(ctx, "POST", "citadel/prize", body),
  /** Records a winner's prize in the clan coffer as a giveaway from whoever paid it. */
  citadelPrizeCoffer: (ctx: ApiContext, body: { end: string; place: number; amount: string; paidBy: string; recipient?: string; note?: string }) =>
    call<import("./citadelTypes").WheelWeek>(ctx, "POST", "citadel/prize/coffer", body),
  citadelHolders: (ctx: ApiContext) => call<{ holders: import("./citadelTypes").CofferHolderInfo[] }>(ctx, "GET", "citadel/prize/holders"),
  citadelPostLocked: (ctx: ApiContext, end: string) => call<{ queued: boolean; channel: string }>(ctx, "POST", `citadel/winners/${encodeURIComponent(end)}/post`),
  /** The event engine's routes (events/...). The caller (a server action) has already checked the path is one of the known shapes. */
  eventsCall: (ctx: ApiContext, method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown) => call<unknown>(ctx, method, path, body),
  points: (ctx: ApiContext) => call<PointsOverview>(ctx, "GET", "points"),
  pointsRewards: (ctx: ApiContext) => call<PointsRewards>(ctx, "GET", "points/rewards"),
  savePointsReward: (
    ctx: ApiContext,
    id: string | null,
    body: { name: string; description: string; cost: number; stock: number | null; active: boolean },
  ) => call<PointsRewards>(ctx, id ? "PUT" : "POST", id ? `points/rewards/${encodeURIComponent(id)}` : "points/rewards", body),
  pointsRedemptions: (ctx: ApiContext) => call<PointsRedemptions>(ctx, "GET", "points/redemptions"),
  handlePointsRedemption: (ctx: ApiContext, id: string, fulfil: boolean) =>
    call<PointsRedemptions>(ctx, "POST", `points/redemptions/${encodeURIComponent(id)}/${fulfil ? "fulfil" : "cancel"}`, {}),
  pointsSubmissions: (ctx: ApiContext) => call<PointsSubmissions>(ctx, "GET", "points/submissions"),
  decidePointsSubmission: (ctx: ApiContext, id: string, approve: boolean, body: { points?: number; note?: string }) =>
    call<PointsSubmissions>(ctx, "POST", `points/submissions/${encodeURIComponent(id)}/${approve ? "approve" : "deny"}`, body),
  savePoints: (ctx: ApiContext, body: { enabled: boolean; unit: string; reviewChannelId: string | null }) => call<PointsOverview>(ctx, "PUT", "points", body),
  awardPoints: (ctx: ApiContext, body: { userId: string; points: number; reason: string }) =>
    call<PointsOverview>(ctx, "POST", "points/award", body),
  warnings: (ctx: ApiContext) => call<WarningList>(ctx, "GET", "warnings"),
  autopunish: (ctx: ApiContext) => call<Autopunish>(ctx, "GET", "warnings/autopunish"),
  saveAutopunish: (ctx: ApiContext, rules: AutopunishRule[]) => call<Autopunish>(ctx, "PUT", "warnings/autopunish", { rules }),
  deleteWarning: (ctx: ApiContext, id: string) => call<WarningList>(ctx, "DELETE", `warnings/${encodeURIComponent(id)}`),
  automod: (ctx: ApiContext) => call<Automod>(ctx, "GET", "automod"),
  saveAutomod: (ctx: ApiContext, body: Pick<Automod, "enabled" | "rules" | "exemptRoles" | "exemptChannels">) => call<Automod>(ctx, "PUT", "automod", body),
  modLog: (ctx: ApiContext) => call<ModLog>(ctx, "GET", "modlog"),
  saveModLog: (ctx: ApiContext, body: Pick<ModLog, "enabled" | "channelId" | "logBans" | "logTimeouts">) => call<ModLog>(ctx, "PUT", "modlog", body),
  accountGate: (ctx: ApiContext) => call<AccountGate>(ctx, "GET", "accountgate"),
  saveAccountGate: (ctx: ApiContext, body: Pick<AccountGate, "enabled" | "minAgeDays" | "action" | "alertChannelId">) =>
    call<AccountGate>(ctx, "PUT", "accountgate", body),
  autoDelete: (ctx: ApiContext) => call<AutoDeleteList>(ctx, "GET", "autodelete"),
  saveAutoDelete: (ctx: ApiContext, channelId: string, filters: string[]) => call<AutoDeleteList>(ctx, "PUT", "autodelete", { channelId, filters }),
  deleteAutoDelete: (ctx: ApiContext, channelId: string) => call<AutoDeleteList>(ctx, "DELETE", `autodelete/${encodeURIComponent(channelId)}`),
  clanProfile: (ctx: ApiContext) => call<ClanProfileData>(ctx, "GET", "clan-profile"),
  saveClanProfile: (ctx: ApiContext, body: Pick<ClanProfileData, "visibility" | "slug" | "displayName" | "tagline" | "description" | "logoUrl" | "colour" | "timezone" | "focus" | "recruiting" | "requirements" | "applyUrl" | "leaderboardOptIn">) =>
    call<ClanProfileData>(ctx, "PUT", "clan-profile", body),
  verifyClanProfile: (ctx: ApiContext) => call<ClanProfileData>(ctx, "POST", "clan-profile/verify"),
  clanListings: (ctx: ApiContext) => call<ClanListings>(ctx, "GET", "clan-listings"),
  suspendClanListing: (ctx: ApiContext, guildId: string, reason: string) => call<ClanListings>(ctx, "POST", `clan-listings/${encodeURIComponent(guildId)}/suspend`, { reason }),
  restoreClanListing: (ctx: ApiContext, guildId: string) => call<ClanListings>(ctx, "POST", `clan-listings/${encodeURIComponent(guildId)}/restore`),
  resolveClanReport: (ctx: ApiContext, id: string, status: string) => call<ClanListings>(ctx, "POST", `clan-reports/${encodeURIComponent(id)}/resolve`, { status }),
  clanEvents: (ctx: ApiContext) => call<ClanEvents>(ctx, "GET", "clan-events"),
  setClanEventScope: (ctx: ApiContext, id: string, scope: "NONE" | "ALLIANCE" | "PUBLIC") =>
    call<ClanEvents>(ctx, "PUT", `clan-events/${encodeURIComponent(id)}`, { scope }),
  alliances: (ctx: ApiContext) => call<AllianceList>(ctx, "GET", "alliances"),
  createAlliance: (ctx: ApiContext, name: string) => call<AllianceList>(ctx, "POST", "alliances", { name }),
  inviteToAlliance: (ctx: ApiContext, id: string, slug: string) => call<AllianceList>(ctx, "POST", `alliances/${encodeURIComponent(id)}/invite`, { slug }),
  acceptAlliance: (ctx: ApiContext, id: string) => call<AllianceList>(ctx, "POST", `alliances/${encodeURIComponent(id)}/accept`, {}),
  leaveAlliance: (ctx: ApiContext, id: string) => call<AllianceList>(ctx, "POST", `alliances/${encodeURIComponent(id)}/leave`, {}),
  removeFromAlliance: (ctx: ApiContext, id: string, guildId: string) =>
    call<AllianceList>(ctx, "POST", `alliances/${encodeURIComponent(id)}/remove`, { guildId }),
  allianceEvents: (ctx: ApiContext, id: string) => call<AllianceEvents>(ctx, "GET", `alliances/${encodeURIComponent(id)}/events`),
  pluginCoverage: (ctx: ApiContext) => call<PluginCoverage>(ctx, "GET", "plugin-coverage"),
  giveaways: (ctx: ApiContext) => call<GiveawayList>(ctx, "GET", "giveaways"),
  startGiveaway: (ctx: ApiContext, body: GiveawayStart) => call<GiveawayList>(ctx, "POST", "giveaways", body),
  endGiveaway: (ctx: ApiContext, id: string) => call<GiveawayList>(ctx, "POST", `giveaways/${encodeURIComponent(id)}/end`),
  rerollGiveaway: (ctx: ApiContext, id: string) => call<GiveawayList>(ctx, "POST", `giveaways/${encodeURIComponent(id)}/reroll`),
  deleteGiveaway: (ctx: ApiContext, id: string) => call<GiveawayList>(ctx, "DELETE", `giveaways/${encodeURIComponent(id)}`),
  autoReplies: (ctx: ApiContext) => call<AutoReplyList>(ctx, "GET", "autoresponders"),
  createAutoReply: (ctx: ApiContext, reply: Omit<AutoReplyDef, "id">) => call<AutoReplyDef>(ctx, "POST", "autoresponders", reply),
  updateAutoReply: (ctx: ApiContext, id: string, reply: Omit<AutoReplyDef, "id">) => call<AutoReplyDef>(ctx, "PUT", `autoresponders/${encodeURIComponent(id)}`, reply),
  deleteAutoReply: (ctx: ApiContext, id: string) => call<AutoReplyList>(ctx, "DELETE", `autoresponders/${encodeURIComponent(id)}`),
  branding: (ctx: ApiContext) => call<BotBranding>(ctx, "GET", "branding"),
  saveBranding: (ctx: ApiContext, body: { displayName: string | null; nickname: string | null }) => call<BotBranding>(ctx, "PUT", "branding", body),
  starboard: (ctx: ApiContext) => call<Starboard>(ctx, "GET", "starboard"),
  saveStarboard: (ctx: ApiContext, body: Pick<Starboard, "enabled" | "channelId" | "emoji" | "threshold" | "selfStar">) => call<Starboard>(ctx, "PUT", "starboard", body),
  goodbye: (ctx: ApiContext) => call<Goodbye>(ctx, "GET", "goodbye"),
  saveGoodbye: (ctx: ApiContext, body: Pick<Goodbye, "enabled" | "channelId" | "content">) => call<Goodbye>(ctx, "PUT", "goodbye", body),
  rolePanels: (ctx: ApiContext) => call<RolePanelList>(ctx, "GET", "rolepanels"),
  rolePanel: (ctx: ApiContext, id: string) => call<RolePanelDef>(ctx, "GET", `rolepanels/${encodeURIComponent(id)}`),
  createRolePanel: (ctx: ApiContext, panel: Omit<RolePanelDef, "id" | "posted" | "channelId" | "messageId">) => call<RolePanelDef>(ctx, "POST", "rolepanels", panel),
  updateRolePanel: (ctx: ApiContext, id: string, panel: Omit<RolePanelDef, "id" | "posted" | "channelId" | "messageId">) => call<RolePanelDef>(ctx, "PUT", `rolepanels/${encodeURIComponent(id)}`, panel),
  deleteRolePanel: (ctx: ApiContext, id: string) => call<RolePanelList>(ctx, "DELETE", `rolepanels/${encodeURIComponent(id)}`),
  postRolePanel: (ctx: ApiContext, id: string, channelId: string) => call<RolePanelDef>(ctx, "POST", `rolepanels/${encodeURIComponent(id)}/post`, { channelId }),
  autoroles: (ctx: ApiContext) => call<Autoroles>(ctx, "GET", "autoroles"),
  saveAutoroles: (ctx: ApiContext, body: Pick<Autoroles, "enabled" | "delaySeconds" | "memberRoleIds" | "botRoleIds">) => call<Autoroles>(ctx, "PUT", "autoroles", body),
  checkup: (ctx: ApiContext) => call<Checkup>(ctx, "GET", "checkup"),
  premiumGuilds: (ctx: ApiContext) => call<PremiumGuilds>(ctx, "GET", "premium-guilds"),
  savePremiumGuild: (ctx: ApiContext, guildId: string, label: string) => call<PremiumGuilds>(ctx, "PUT", `premium-guilds/${encodeURIComponent(guildId)}`, { label }),
  removePremiumGuild: (ctx: ApiContext, guildId: string) => call<PremiumGuilds>(ctx, "DELETE", `premium-guilds/${encodeURIComponent(guildId)}`),
  betaGuilds: (ctx: ApiContext) => call<BetaGuilds>(ctx, "GET", "beta-guilds"),
  saveBetaGuild: (ctx: ApiContext, guildId: string, label: string) => call<BetaGuilds>(ctx, "PUT", `beta-guilds/${encodeURIComponent(guildId)}`, { label }),
  removeBetaGuild: (ctx: ApiContext, guildId: string) => call<BetaGuilds>(ctx, "DELETE", `beta-guilds/${encodeURIComponent(guildId)}`),
  notices: (ctx: ApiContext) => call<{ notices: BotNotice[] }>(ctx, "GET", "notices"),
  /** The pages this person starred in the sidebar of this server, in the order they starred them. */
  favorites: (ctx: ApiContext) => call<{ paths: string[] }>(ctx, "GET", "prefs/favorites"),
  saveFavorites: (ctx: ApiContext, paths: string[]) => call<{ paths: string[] }>(ctx, "PUT", "prefs/favorites", { paths }),
  addNotice: (ctx: ApiContext, severity: BotNotice["severity"], body: string) => call<{ notices: BotNotice[] }>(ctx, "POST", "notices", { severity, body }),
  removeNotice: (ctx: ApiContext, id: string) => call<{ notices: BotNotice[] }>(ctx, "DELETE", `notices/${encodeURIComponent(id)}`),
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
