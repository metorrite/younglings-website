/** The event engine's answers as the dashboard reads them (the bot's /internal/admin/events routes). */
export type EventStatus = "DRAFT" | "SIGNUPS" | "RUNNING" | "SCORING" | "DONE" | "CANCELLED";

export interface EventSummary {
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
    /** Bingo only: the board's size, seed and the objective keys in tile order, plus the bonuses for lines and the blackout. */
    board?: { size: number; seed: number; keys: string[] };
    bonuses?: EventBonus[];
    lineBonus?: number;
    blackoutBonus?: number;
  };
  createdAt: string;
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

export interface EventDetail {
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
