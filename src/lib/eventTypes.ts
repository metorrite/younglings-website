/** The event engine's answers as the dashboard reads them (the bot's /internal/admin/events routes). */
export type EventStatus = "DRAFT" | "SIGNUPS" | "RUNNING" | "SCORING" | "DONE" | "CANCELLED";

export interface EventSummary {
  /** Hidden from the main list (only a finished or cancelled event can be archived). */
  archived: boolean;
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
    /** Bingo only: the board's size, seed and the objective keys in tile order, plus the bonuses for lines and the blackout. */
    board?: { size: number; seed: number; keys: string[] };
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

export interface EventDetail {
  /** For a bingo: the boss, item and picture of each tile. Empty for other kinds. */
  tiles: BingoTileInfo[];
  /** People named to run this one event from Discord (start and finish it, decide proof) without being staff. */
  organisers: EventOrganiser[];
  /** Discord signups the event's rules turned away, with the reason. */
  refused: EventRefusal[];
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
