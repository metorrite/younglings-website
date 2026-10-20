import type { FieldKind, FieldPurpose, HelpKind, PanelDefaults, PanelDefinition, PanelField } from "@/lib/jonnybot-admin";

/**
 * Rebuilding the ticket forms' untrusted input, shared by the clan console's actions and the bot dashboard's. The arguments of a
 * Server Action come from the browser, so they are rebuilt field by field into the exact shape the bot expects; the bot then
 * validates the *content* and its messages go straight back to the form.
 */

const KINDS: FieldKind[] = ["SHORT", "PARAGRAPH", "SELECT", "CHECKBOX"];
const HELP_KINDS: HelpKind[] = ["NONE", "PVM", "CA", "INFO"];
const PURPOSES: FieldPurpose[] = ["NONE", "BOSS", "TIER", "ACHIEVEMENT", "ATTEMPTS"];

export const text = (v: unknown): string => (typeof v === "string" ? v : "");
export const idOrNull = (v: unknown): string | null => (typeof v === "string" && /^\d+$/.test(v) ? v : null);
const idList = (v: unknown): string[] => (Array.isArray(v) ? v.map(idOrNull).filter((id): id is string => id !== null) : []);
export const intOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null);

export function cleanPanel(input: unknown): PanelDefinition | null {
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
      purpose: PURPOSES.includes(f.purpose as FieldPurpose) ? (f.purpose as FieldPurpose) : "NONE",
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
    closeByRequester: p.closeByRequester !== false,
    closeByHelpers: p.closeByHelpers !== false,
    helpKind: HELP_KINDS.includes(p.helpKind as HelpKind) ? (p.helpKind as HelpKind) : "NONE",
    enabled: p.enabled !== false,
    perUserLimit: intOrNull(p.perUserLimit) ?? 1,
    defaultPingRoleId: idOrNull(p.defaultPingRoleId),
    helperCap: intOrNull(p.helperCap),
    escalationHours: intOrNull(p.escalationHours),
    defaultEscalateRoleId: idOrNull(p.defaultEscalateRoleId),
    helperRoleIds: idList(p.helperRoleIds),
    staffRoleIds: idList(p.staffRoleIds),
    closeRoleIds: idList(p.closeRoleIds),
    fields,
  };
}

/** The shared settings a new panel starts with, rebuilt from untrusted input the same way. */
export function cleanDefaults(input: unknown): PanelDefaults | null {
  const panel = cleanPanel(input);
  if (!panel) return null;
  return {
    buttonLabel: panel.buttonLabel,
    categoryId: panel.categoryId,
    channelNameTemplate: panel.channelNameTemplate,
    welcomeText: panel.welcomeText,
    openingMessage: panel.openingMessage,
    perUserLimit: panel.perUserLimit,
    defaultPingRoleId: panel.defaultPingRoleId,
    helperCap: panel.helperCap,
    escalationHours: panel.escalationHours,
    defaultEscalateRoleId: panel.defaultEscalateRoleId,
    closeByRequester: panel.closeByRequester,
    closeByHelpers: panel.closeByHelpers,
    helperRoleIds: panel.helperRoleIds,
    staffRoleIds: panel.staffRoleIds,
    closeRoleIds: panel.closeRoleIds,
  };
}

