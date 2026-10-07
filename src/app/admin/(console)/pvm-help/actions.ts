"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { throttle } from "@/lib/ratelimit";
import { adminApi, type ApiResult, type HelpSettings } from "@/lib/jonnybot-admin";

/**
 * Server Actions for the PvM Help settings. Each begins with `requireAdmin()` (a Server Action can be POSTed directly, without
 * loading the page), the acting user comes only from the verified login session, and the browser-supplied arguments are rebuilt
 * field by field before the bot validates their content.
 */

export type HelpActionResult<T> = { ok: true; data: T } | { ok: false; error: string; problems: string[] };

function outcome<T>(result: ApiResult<T>): HelpActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

const idOrNull = (v: unknown): string | null => (typeof v === "string" && /^\d+$/.test(v) ? v : null);
const hoursOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null);
const text = (v: unknown): string => (typeof v === "string" ? v : "");

export async function saveHelpSettingsAction(input: unknown): Promise<HelpActionResult<HelpSettings>> {
  const ctx = await requireAdmin("/admin/pvm-help");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read.", problems: [] };
  const s = input as Record<string, unknown>;

  const result = await adminApi.saveHelpSettings(ctx, {
    helperRoleId: idOrNull(s.helperRoleId),
    helperPlusRoleId: idOrNull(s.helperPlusRoleId),
    guidelines: text(s.guidelines),
    memberPingOnOpen: s.memberPingOnOpen !== false,
    memberEscalationHours: hoursOrNull(s.memberEscalationHours),
    guestPingsEnabled: s.guestPingsEnabled === true,
    guestPingOnOpen: s.guestPingOnOpen !== false,
    guestEscalationHours: hoursOrNull(s.guestEscalationHours),
    guestHighTierNeedsAttempts: s.guestHighTierNeedsAttempts !== false,
    highTierLabels: text(s.highTierLabels),
  });
  revalidatePath("/admin/pvm-help");
  return outcome(result);
}

export async function postHelpGuidelinesAction(channelId: string): Promise<HelpActionResult<HelpSettings>> {
  const ctx = await requireAdmin("/admin/pvm-help");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d+$/.test(channelId)) return { ok: false, error: "Choose a channel to post in.", problems: [] };

  const result = await adminApi.postHelpGuidelines(ctx, channelId);
  revalidatePath("/admin/pvm-help");
  return outcome(result);
}
