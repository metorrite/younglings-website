/** The event engine's answers as the dashboard reads them (the bot's /internal/admin/events routes). */
export type EventStatus = "DRAFT" | "SIGNUPS" | "RUNNING" | "SCORING" | "DONE" | "CANCELLED";

export interface EventSummary {
  /** Hidden from the main list (only a finished or cancelled event can be archived). */
  archived: boolean;
  /** Only on the event list: players in, players on the waitlist, and proof (or verification) nobody has decided yet. */
  players?: number;
  waiting?: number;
  proofWaiting?: number;
  id: string;
  name: string;
  description: string;
  template: string;
  status: EventStatus;
  scope: "PRIVATE" | "ALLIANCE" | "PUBLIC";
  scoringMode: "INDIVIDUAL" | "TEAM";
  startsAt: string | null;
  endsAt: string | null;
  maxParticipants: number;
  config: {
    queue?: string;
    teamPolicy?: string;
    signupClosesAt?: string;
    signupChannelId?: string;
    signupAdminChannelId?: string;
    /** Bingo: where the live board picture is kept, and where players' screenshots go for review. */
    boardChannelId?: string;
    reviewChannelId?: string;
    buyIn?: { enabled?: boolean; kind?: string; amount?: number; showPot?: boolean };
    /** How much of the setup checklist the event follows: none ("OFF", start whenever) or the steps ("STANDARD"; "FULL" adds later ones). */
    setup?: { mode?: "OFF" | "STANDARD" | "FULL" };
    /** Whether players must be verified, by when, and what they are told to send. */
    verification?: { required?: boolean; gate?: VerificationGate; instructions?: string };
    submissions?: { require?: boolean; receipts?: boolean };
    /** Bingo only: the board's size, seed and the objective keys in tile order, plus the bonuses for lines and the blackout. */
    board?: { size: number; seed: number; keys: string[]; layout?: string; unlock?: "locked" | "free"; pool?: string; look?: string; display?: "SHARED" | "OWN" | "BOTH"; title?: string; subtitle?: string; fog?: boolean; names?: boolean; numbers?: boolean; accent?: string; curve?: string; freeCentre?: boolean };
    bonuses?: EventBonus[];
    lineBonus?: number;
    blackoutBonus?: number;
  };
  createdAt: string;
}

/** When a player must have passed verification to count: when signing up, before teams are made, or before the event starts. */
export type VerificationGate = "SIGNUP" | "TEAMS" | "START";
export type VerificationState = "NOT_REQUIRED" | "PENDING" | "VERIFIED" | "REJECTED" | "WAIVED";

/** One line of the "before it starts" checklist; `required` steps hold the start back and `blockers` says why in words. */
export interface EventPrepStep {
  key: string;
  label: string;
  state: "WAITING" | "ACTIVE" | "DONE" | "SKIPPED";
  required: boolean;
  detail: string;
  blockers: string[];
}

export interface EventPrep {
  steps: EventPrepStep[];
  /** Everything that stops the event starting right now. */
  blockers: string[];
  /** Things worth knowing that don't stop it. */
  warnings: string[];
  ready: boolean;
}

export interface EventSetupInfo {
  signupsClosedAt: string | null;
  signupsClosedBy: string | null;
  rosterConfirmedAt: string | null;
  rosterConfirmedBy: string | null;
  /** When an organiser called the teams final (an event scored by team), and who. */
  teamsFinalisedAt: string | null;
  teamsFinalisedBy: string | null;
}

/** The event's verification settings and how many players are in each state (the waitlist isn't counted). */
export interface EventVerification {
  required: boolean;
  gate: VerificationGate;
  instructions: string;
  verified: number;
  waived: number;
  pending: number;
  rejected: number;
}

export interface EventBonus {
  name: string;
  keys: string[];
  points: number;
}

export interface EventList {
  events: EventSummary[];
  maxOpen: number;
}

export interface EventObjective {
  key: string;
  label: string;
  description: string;
  points: number;
  evidence: "AUTO" | "PROOF" | "EITHER" | "ORGANISER";
  target: number;
  repeatLimit: number;
  prerequisites: string[];
}

export interface EventPlayer {
  userId: string;
  userName: string | null;
  guildId: string;
  teamId: string | null;
  joinedAt: string;
  kind: "HOME_CLAN" | "HOME_OTHER" | "PARTNER";
  waiting: boolean;
  buyIn: "NONE" | "DUE" | "PAID" | "REFUNDED";
  /** "NOT_REQUIRED" unless the event asks for verification. */
  verification: VerificationState;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationNote: string;
  /** What an organiser thinks of the player's strength, 1 to 5 (null: not rated). Only for an event scored by team. */
  rating: number | null;
  /** A rating worked out from their stats compared with the other players' (null: not enough to compare). */
  suggestedRating: number | null;
  /** What the player counts as when balancing teams: the organiser's rating, else the suggested one, else average. Null for an event not scored by team. */
  effectiveRating: number | null;
  /** The latest stats of their linked RuneScape name, when they have one. */
  strength: PlayerStrength | null;
  /** Why they can't be put on a team right now (waitlist, verification), or null when they can. */
  teamBlock: string | null;
  /** Where they came from: the event's Discord signup (the two follow each other), their own join, or an organiser adding them. */
  source: "SIGNUP" | "SELF" | "STAFF";
}

/** A player an organiser removed and barred from the event again. */
export interface EventBan {
  userId: string;
  userName: string | null;
  reason: string;
  bannedBy: string | null;
  at: string;
}

export interface PlayerStrength {
  rsn: string;
  totalLevel: number;
  combatLevel: number;
  totalXp: number;
}

/** A starting point for the teams from the bot: where each unplaced player would go. Nothing changes until it is applied. */
export interface TeamSuggestion {
  moves: { userId: string; teamId: string | null }[];
  notes: string[];
}

export interface EventPrize {
  id: string;
  place: number;
  placeTo: number;
  kind: "IN_GAME" | "CLAN_POINTS" | "OTHER";
  description: string;
  amount: number;
  percentOfPot: number;
  split: "EQUAL" | "EACH" | "CAPTAIN";
}

export interface EventRefusal {
  userId: string;
  userName: string | null;
  reason: string;
  at: string;
}

/** What a bingo tile means: its boss, its item, and the item's picture (a key under /items), when the label is a drop. */
export interface BingoTileInfo {
  key: string;
  boss: string | null;
  item: string;
  icon: string | null;
}

/** Every boss with the items in its loot table, for the board editor's dropdowns. */
export interface BingoCatalog {
  bosses: { name: string; image: string | null; items: { name: string; key: string; rarity: string; icon: boolean }[] }[];
}

export interface EventOrganiser {
  userId: string;
  userName: string | null;
}

/**
 * The looks a bingo board can have: what its picture in Discord is drawn on (the bot paints them; the previews are in /public/bingo-looks). A board that
 * names no look keeps how it was drawn before looks existed: a shape in the template picture, a grid as the plain dark board ("plain" here, never sent).
 */
export const BINGO_LOOKS = [
  { id: "runescape", label: "RuneScape", blurb: "A scene painted for each shape: a desert night, a treasure map, a ritual circle, an old grove. The square grid gets a stone hall." },
  { id: "classic", label: "Template", blurb: "The original template pictures: a dark teal board with a gold frame." },
] as const;
/** What a new bingo gets when its creator doesn't choose. */
export const DEFAULT_BINGO_LOOK = "runescape";
export const PLAIN_LOOK = { id: "plain", label: "Plain", blurb: "How square grids were drawn before looks: a flat dark board." } as const;

/** One of the picture shapes a bingo can have instead of a square grid, with how its tiles open up. Tile numbers are as drawn on the picture. */
export interface BingoLayoutInfo {
  id: string;
  name: string;
  blurb: string;
  rule: string;
  tiles: number;
  /** Tile numbers in rows from the top of the picture down. */
  rows: number[][];
  rowNames: string[];
  /** Tile number to the numbers of the tiles that must be done first. */
  requires: Record<string, number[]>;
  /** Whether those rules are enforced ("locked") or the shape only earns its bonuses ("free"). Only on an event's own detail. */
  unlock?: "locked" | "free";
}

export interface EventDetail {
  /** For a bingo in one of the picture shapes: which one and its rules. Null for a square grid and other kinds. */
  layout?: BingoLayoutInfo | null;
  /** For a bingo: the boss, item and picture of each tile. Empty for other kinds. */
  tiles: BingoTileInfo[];
  /** People named to run this one event from Discord (start and finish it, decide proof) without being staff. */
  organisers: EventOrganiser[];
  /** Discord signups the event's rules turned away, with the reason. */
  refused: EventRefusal[];
  /** Players barred from this event. */
  bans: EventBan[];
  event: EventSummary;
  objectives: EventObjective[];
  teams: { id: string; name: string; captainId: string | null }[];
  participants: EventPlayer[];
  signup: { attached: boolean; active: boolean; entries: number; channelsChosen: boolean };
  prizes: EventPrize[];
  pot: number;
  potVisible: boolean;
  buyInEnabled: boolean;
  nextStages: EventStatus[];
  editable: boolean;
  /** The checklist of what is left before the event can start. */
  prep: EventPrep;
  setup: EventSetupInfo;
  verification: EventVerification;
}

export interface EventClaim {
  id: string;
  kind: "OBJECTIVE" | "VERIFICATION";
  objective: string;
  userId: string;
  userName: string | null;
  amount: number;
  note: string;
  proofUrl: string | null;
  status: "PENDING" | "APPROVED" | "DENIED";
  decidedByName: string | null;
  decisionNote: string | null;
  createdAt: string;
}

export interface EventClaims {
  pending: EventClaim[];
  decided: EventClaim[];
}

export interface EventStanding {
  rank: number;
  subject: string;
  kind: "TEAM" | "PLAYER";
  label: string;
  points: number;
  objectivesCompleted: number;
  completions: Record<string, number>;
  /** Names of the bonuses this player or team has earned. */
  bonuses: string[];
}

export interface EventStandings {
  scoringMode: "INDIVIDUAL" | "TEAM";
  standings: EventStanding[];
}

export interface EventAward {
  id: string;
  place: number;
  userId: string;
  userName: string | null;
  kind: "IN_GAME" | "CLAN_POINTS" | "OTHER";
  description: string;
  amount: number;
  status: "PENDING" | "PAID" | "REVOKED" | "REFUNDED";
  history: { from: string; to: string; byName: string | null; note: string; at: string }[];
}

// ---------- roles and channels ----------

export type SpaceUse = "create" | "existing" | "none";
export type SpaceAction = "create" | "keep" | "use_existing" | "remove";

/** One of the single channels an event can have (staff, announcements, general, board, review) and how it is provided. */
export interface SpaceSlot {
  key: string;
  label: string;
  hint: string;
  /** False when this kind of event doesn't have the channel (only a bingo has a board). */
  applies: boolean;
  /** True when the organiser chose it; otherwise it is just the default. */
  explicit: boolean;
  use: SpaceUse;
  channelId: string | null;
  pattern: string;
  defaultPattern: string;
}

/** A name pattern for the category, team and player channels and for the roles. */
export interface SpaceName {
  key: string;
  label: string;
  hint: string;
  pattern: string;
  defaultPattern: string;
  /** The {variables} the pattern may use. */
  variables: string[];
}

export interface SpaceSettings {
  enabled: boolean;
  teamChannels: boolean;
  playerChannels: boolean;
  slots: SpaceSlot[];
  names: SpaceName[];
}

/** What the page sends to preview or save the choices: only what differs from the defaults is needed. */
export interface SpaceDraft {
  enabled: boolean;
  teamChannels: boolean;
  playerChannels: boolean;
  slots: Record<string, { use: SpaceUse; channelId?: string }>;
  names: Record<string, string>;
}

export interface SpaceGrant {
  who: "everyone" | "staff" | "organisers" | "participants" | "team" | "player" | "bot";
  ref: string | null;
  level: "hidden" | "read" | "chat" | "manage" | "bot";
}

export interface SpaceRole {
  key: string;
  name: string;
  action: SpaceAction;
  id: string | null;
  members: number;
  note: string;
}

export interface SpaceChannel {
  key: string;
  kind: string;
  kindLabel: string;
  name: string;
  action: SpaceAction;
  id: string | null;
  /** The key of the category it goes in. */
  parent: string | null;
  note: string;
  access: SpaceGrant[];
}

/** How far the bot's background setup or removal of an event's roles and channels got. */
export interface SpaceJob {
  kind: "setup" | "removal";
  state: "running" | "done" | "failed";
  done: number;
  total: number;
  message: string;
  startedAt: string;
  finishedAt: string | null;
}

export interface SpaceView {
  /** The latest setup or removal, running or finished (null when there hasn't been one since the bot started). */
  job: SpaceJob | null;
  settings: SpaceSettings;
  teamEvent: boolean;
  state: { enabled: boolean; applied: boolean; complete: boolean; appliedAt: string | null; appliedBy: string | null; note: string };
  /** Nothing stops it from being set up right now. */
  ready: boolean;
  /** Everything wanted is already there. */
  complete: boolean;
  blockers: string[];
  warnings: string[];
  roles: SpaceRole[];
  channels: SpaceChannel[];
  staffRoles: { id: string; name: string }[];
  summary: { newRoles: number; newChannels: number; toRemove: number; players: number; excluded: number };
}

/** What happens to an event's roles and channels once it is over (`events/{id}/wrapup`). Days: 0 is straight away, -1 is never (an organiser decides). */
export interface WrapupSettings {
  lockOnFinish: boolean;
  rolesDays: number;
  channelsDays: number;
  channelsAction: "NONE" | "ARCHIVE" | "DELETE";
  archiveCategoryId: string | null;
}

export interface WrapupView {
  over: boolean;
  status: EventStatus;
  settings: WrapupSettings;
  state: { finishedAt: string | null; lockedAt: string | null; rolesRemovedAt: string | null; channelsDoneAt: string | null; channelsHow: string | null; exportedAt: string | null };
  /** When each step happens by itself; null when it won't (never, or already done). */
  schedule: { lockAt: string | null; rolesAt: string | null; channelsAt: string | null };
  counts: { channels: number; categories: number; roles: number; chosenChannels: number; privateChannels: number };
  job: { kind: string; state: "running" | "done" | "failed"; done: number; total: number; message: string; startedAt: string; finishedAt: string | null } | null;
  export: { name: string; size: number; madeAt: string; channels: number; messages: number; images: number; links: number } | null;
}
