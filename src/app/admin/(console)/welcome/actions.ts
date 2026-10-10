"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { throttle } from "@/lib/ratelimit";
import { adminApi, type ApiResult, type WelcomeConfig, type WelcomeDraft, type WelcomeMessageType } from "@/lib/jonnybot-admin";

/**
 * Server Actions for the welcome message. Each begins with `requireAdmin()` (a Server Action can be POSTed directly, without
 * loading the page), the acting user comes only from the verified login session, and the browser-supplied draft is rebuilt
 * field by field before the bot validates its content against Discord's limits.
 */

export type WelcomeActionResult<T> = { ok: true; data: T } | { ok: false; error: string; problems: string[] };

function outcome<T>(result: ApiResult<T>): WelcomeActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

const text = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");
const flag = (v: unknown): boolean => v === true;
const idOrNull = (v: unknown): string | null => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);
const TYPES: WelcomeMessageType[] = ["MESSAGE", "EMBED", "EMBED_TEXT"];

/** The browser's draft, rebuilt into exactly the shape the bot expects (anything unexpected is dropped or defaulted). */
function draftFrom(input: unknown): WelcomeDraft | null {
  if (typeof input !== "object" || input === null) return null;
  const s = input as Record<string, unknown>;
  const type = TYPES.find((t) => t === s.messageType) ?? "EMBED_TEXT";
  const color = typeof s.color === "number" && Number.isInteger(s.color) && s.color >= 0 && s.color <= 0xffffff ? s.color : null;
  const fields = (Array.isArray(s.fields) ? s.fields : []).slice(0, 40).map((raw) => {
    const f = (raw ?? {}) as Record<string, unknown>;
    return { name: text(f.name, 300), value: text(f.value, 1200), inline: flag(f.inline) };
  });

  return {
    enabled: flag(s.enabled),
    messageType: type,
    channelId: idOrNull(s.channelId),
    alsoDm: flag(s.alsoDm),
    content: text(s.content, 2500),
    color,
    title: text(s.title, 400),
    titleUrl: text(s.titleUrl, 2100),
    description: text(s.description, 4500),
    authorName: text(s.authorName, 400),
    authorIconUrl: text(s.authorIconUrl, 2100),
    thumbnailUrl: text(s.thumbnailUrl, 2100),
    imageUrl: text(s.imageUrl, 2100),
    footerText: text(s.footerText, 2200),
    footerIconUrl: text(s.footerIconUrl, 2100),
    fields,
    linkButton: flag(s.linkButton),
    linkButtonLabel: text(s.linkButtonLabel, 120),
  };
}

export async function saveWelcomeAction(input: unknown): Promise<WelcomeActionResult<WelcomeConfig>> {
  const ctx = await requireAdmin("/admin/welcome");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const draft = draftFrom(input);
  if (!draft) return { ok: false, error: "That welcome message couldn't be read.", problems: [] };

  const result = await adminApi.saveWelcome(ctx, draft);
  revalidatePath("/admin/welcome");
  return outcome(result);
}

export async function testWelcomeAction(input: unknown): Promise<WelcomeActionResult<{ sent: boolean; channelName: string; dmSent: boolean }>> {
  const ctx = await requireAdmin("/admin/welcome");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const draft = draftFrom(input);
  if (!draft) return { ok: false, error: "That welcome message couldn't be read.", problems: [] };

  return outcome(await adminApi.testWelcome(ctx, draft));
}
