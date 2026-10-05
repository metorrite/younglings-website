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
  fields: PanelField[];
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

export interface TicketDetail extends TicketRow {
  helpers: { id: string; name: string | null }[];
  closedByName: string | null;
  transcript: string | null;
  transcriptMessageCount: number | null;
}

// ---------- plumbing ----------

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
