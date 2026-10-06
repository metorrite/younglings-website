"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { throttle } from "@/lib/ratelimit";
import { adminApi, type ApiResult, type FieldKind, type PanelDefinition, type PanelField, type TicketSettings } from "@/lib/jonnybot-admin";

/**
 * Server Actions for the ticket dashboard. Each one starts with `requireAdmin()`: Server Actions can be
 * invoked by a direct POST that never loads a page, so the page-level check isn't protection on its own. The
 * acting user always comes from the verified login session (inside `requireAdmin`), never from the arguments.
 *
 * The arguments themselves come from the browser and are untrusted, so they're rebuilt field by field into
 * the exact shape the bot expects; the bot validates the *content* (lengths, roles that exist, and so on)
 * and its messages are passed straight back to the form.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; problems: string[] };

function outcome<T>(result: ApiResult<T>): ActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

function invalid(error: string): ActionResult<never> {
  return { ok: false, error, problems: [] };
}

// ---------- rebuilding untrusted input ----------

const KINDS: FieldKind[] = ["SHORT", "PARAGRAPH", "SELECT", "CHECKBOX"];

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const idOrNull = (v: unknown): string | null => (typeof v === "string" && /^\d+$/.test(v) ? v : null);
const idList = (v: unknown): string[] => (Array.isArray(v) ? v.map(idOrNull).filter((id): id is string => id !== null) : []);
const intOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null);

function cleanPanel(input: unknown): PanelDefinition | null {
  if (typeof input !== "object" || input === null) return null;
  const p = input as Record<string, unknown>;

  const fields: PanelField[] = (Array.isArray(p.fields) ? p.fields : []).map((raw) => {
    const f = (raw ?? {}) as Record<string, unknown>;
    const kind = KINDS.includes(f.kind as FieldKind) ? (f.kind as FieldKind) : "SHORT";
    return {
      label: text(f.label),
      kind,
      required: f.required !== false,
      placeholder: text(f.placeholder) || null,
      maxLength: intOrNull(f.maxLength),
      options:
        kind === "SELECT" && Array.isArray(f.options)
          ? f.options.map((rawOption) => {
              const o = (rawOption ?? {}) as Record<string, unknown>;
              return { label: text(o.label), pingRoleId: idOrNull(o.pingRoleId), escalateRoleId: idOrNull(o.escalateRoleId) };
            })
          : [],
    };
  });

  return {
    name: text(p.name),
    title: text(p.title),
    description: text(p.description),
    buttonLabel: text(p.buttonLabel),
    categoryId: idOrNull(p.categoryId),
    channelNameTemplate: text(p.channelNameTemplate),
    welcomeText: text(p.welcomeText),
    openingMessage: text(p.openingMessage),
    enabled: p.enabled !== false,
    perUserLimit: intOrNull(p.perUserLimit) ?? 1,
    defaultPingRoleId: idOrNull(p.defaultPingRoleId),
    helperCap: intOrNull(p.helperCap),
    escalationHours: intOrNull(p.escalationHours),
    defaultEscalateRoleId: idOrNull(p.defaultEscalateRoleId),
    helperRoleIds: idList(p.helperRoleIds),
    staffRoleIds: idList(p.staffRoleIds),
    fields,
  };
}

// ---------- actions ----------

/** Creates the panel when `panelId` is null, otherwise replaces it. Returns the saved panel (with its id). */
export async function savePanelAction(panelId: string | null, input: unknown): Promise<ActionResult<PanelDefinition>> {
  const ctx = await requireAdmin("/admin/tickets");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const panel = cleanPanel(input);
  if (!panel) return invalid("That panel couldn't be read.");
  if (panelId !== null && !/^\d+$/.test(panelId)) return invalid("That isn't a valid panel.");

  const result = panelId === null ? await adminApi.createPanel(ctx, panel) : await adminApi.updatePanel(ctx, panelId, panel);
  revalidatePath("/admin/tickets");
  return outcome(result);
}

export async function deletePanelAction(panelId: string): Promise<ActionResult> {
  const ctx = await requireAdmin("/admin/tickets");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d+$/.test(panelId)) return invalid("That isn't a valid panel.");

  const result = await adminApi.deletePanel(ctx, panelId);
  revalidatePath("/admin/tickets");
  return result.ok ? { ok: true, data: undefined } : outcome(result);
}

export async function postPanelAction(panelId: string, channelId: string): Promise<ActionResult<PanelDefinition>> {
  const ctx = await requireAdmin("/admin/tickets");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d+$/.test(panelId) || !/^\d+$/.test(channelId)) return invalid("Choose a channel to post in.");

  const result = await adminApi.postPanel(ctx, panelId, channelId);
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/panels/${panelId}`);
  return outcome(result);
}

export async function saveSettingsAction(input: unknown): Promise<ActionResult<TicketSettings>> {
  const ctx = await requireAdmin("/admin/tickets/settings");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return invalid("Those settings couldn't be read.");
  const s = input as Record<string, unknown>;

  const result = await adminApi.saveSettings(ctx, {
    logChannelId: idOrNull(s.logChannelId),
    transcriptDm: s.transcriptDm !== false,
    closeDelaySeconds: intOrNull(s.closeDelaySeconds) ?? 10,
    transcriptRetentionDays: intOrNull(s.transcriptRetentionDays),
  });
  revalidatePath("/admin/tickets/settings");
  return outcome(result);
}
