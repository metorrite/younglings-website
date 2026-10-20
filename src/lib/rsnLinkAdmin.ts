import { adminCall, type ApiContext } from "@/lib/jonnybot-admin";

/**
 * The owner's RS Link abuse view (T-118): typed calls to the bot's `/internal/admin/rsnlink/*` routes. The bot checks the owner on every one of
 * them; the pages and Server Actions check too (requireOwner). Subjects (IP, Discord, tracking id, RSN) come back only as an 8-character
 * fingerprint, never the value; a link's Discord account is decrypted only by {@link rsnLinkAdmin.reveal}, which the bot audits.
 */

export interface RsLinkOverview {
  events: Record<string, { day: number; week: number }>;
  activeLinks: number;
  disputedLinks: number;
  openDisputes: number;
  activeBlocks: number;
  pendingPairings: number;
  dmsLastHour: number;
  dmHourlyCap: number;
  dmBreakerOpen: boolean;
  generatedAt: string;
}

export interface RsLinkEvent {
  at: string;
  kind: string;
  subjectKind: string;
  subject: string | null;
  detail: string | null;
}

export interface RsLinkOffender {
  subjectKind: string;
  subject: string;
  lockouts: number;
  lastAt: string;
  blocked: boolean;
}

export interface RsLinkBlock {
  id: string;
  subjectKind: string;
  subject: string;
  reason: string;
  until: string;
  createdBy: string;
  createdAt: string;
}

export interface RsLinkSide {
  linkId: string;
  status: string;
  method?: string;
  verification?: string;
  linkedAt?: string;
  endedAt?: string | null;
  rsn?: string;
  lastSeenAt?: string;
  tracked?: boolean;
  devices?: number;
  /** Fingerprint of the Discord account, so two links of the same account can be told apart without revealing it. */
  discord?: string;
}

export interface RsLinkDispute {
  id: string;
  rsn: string;
  status: string;
  openedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  note: string | null;
  incumbent: RsLinkSide | null;
  claimant: RsLinkSide | null;
}

export interface RsLinkAudit {
  at: string;
  actor: string;
  action: string;
  target: string | null;
}

export type SubjectKind = "ip" | "discord" | "tracking" | "rsn";

export const rsnLinkAdmin = {
  overview: (ctx: ApiContext) => adminCall<RsLinkOverview>(ctx, "GET", "rsnlink/overview"),
  events: (ctx: ApiContext) => adminCall<{ events: RsLinkEvent[] }>(ctx, "GET", "rsnlink/events"),
  offenders: (ctx: ApiContext) => adminCall<{ offenders: RsLinkOffender[]; lockoutsBeforeBlock: number }>(ctx, "GET", "rsnlink/offenders"),
  blocks: (ctx: ApiContext) => adminCall<{ blocks: RsLinkBlock[] }>(ctx, "GET", "rsnlink/blocks"),
  disputes: (ctx: ApiContext) => adminCall<{ disputes: RsLinkDispute[] }>(ctx, "GET", "rsnlink/disputes"),
  audit: (ctx: ApiContext) => adminCall<{ audit: RsLinkAudit[] }>(ctx, "GET", "rsnlink/audit"),
  block: (ctx: ApiContext, subjectKind: SubjectKind, value: string, reason: string, hours: number) =>
    adminCall<{ blocks: RsLinkBlock[] }>(ctx, "POST", "rsnlink/blocks", { subjectKind, value, reason, hours }),
  unblock: (ctx: ApiContext, id: string) => adminCall<{ blocks: RsLinkBlock[] }>(ctx, "DELETE", `rsnlink/blocks/${encodeURIComponent(id)}`),
  resolve: (ctx: ApiContext, id: string, winner: "incumbent" | "claimant", note: string) =>
    adminCall<{ disputes: RsLinkDispute[] }>(ctx, "POST", `rsnlink/disputes/${encodeURIComponent(id)}/resolve`, { winner, note }),
  search: (ctx: ApiContext, rsn: string) => adminCall<{ links: RsLinkSide[] }>(ctx, "POST", "rsnlink/links/search", { rsn }),
  remove: (ctx: ApiContext, id: string, reason: string) => adminCall<{ link: RsLinkSide }>(ctx, "POST", `rsnlink/links/${encodeURIComponent(id)}/remove`, { reason }),
  reveal: (ctx: ApiContext, id: string) =>
    adminCall<{ linkId: string; discordId: string; discordName: string | null }>(ctx, "POST", `rsnlink/links/${encodeURIComponent(id)}/reveal`),
};

/** Plain words for each abuse event kind, for the owner's tables. Unknown kinds show as they are. */
export const EVENT_LABELS: Record<string, string> = {
  wrong_code: "Wrong code typed on the link page",
  rate_limited: "Hit a rate limit",
  lockout: "Locked out (too many tries)",
  auto_block: "Blocked automatically (3 lockouts in a day)",
  denied: "Pressed “This isn't me”",
  name_refused: "Claim refused (name held by a tracked or verified link)",
  dispute_opened: "Name claimed by a second character",
  character_mismatch: "Token used by another character",
  dm_not_me: "DM recipient pressed “Not me”",
  dm_breaker: "DM limit for the hour reached",
};

export const SUBJECT_LABELS: Record<string, string> = { ip: "IP", discord: "Discord", tracking: "Tracking id", rsn: "RSN", service: "Service" };

/** Checks the shape of what the owner typed before it goes to the bot (which checks again). */
export function subjectProblem(kind: SubjectKind, value: string): string | null {
  const v = value.trim();
  if (kind === "discord") return /^\d{17,20}$/.test(v) ? null : "A Discord id is 17 to 20 digits.";
  if (kind === "tracking") return /^-?\d{1,20}$/.test(v) ? null : "A tracking id is a number.";
  if (kind === "rsn") return /^[A-Za-z0-9 _-]{1,12}$/.test(v) ? null : "An RSN is 1 to 12 letters, digits, spaces, - or _.";
  return /^[0-9A-Fa-f:.]{2,45}$/.test(v) ? null : "That isn't an IP address.";
}
