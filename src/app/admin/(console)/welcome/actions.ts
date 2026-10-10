"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { throttle } from "@/lib/ratelimit";
import { adminApi, type ApiResult, type WelcomeActionResult, type WelcomeConfig } from "@/lib/jonnybot-admin";
import { readUploadedFile, requestOrigin, uploadedImageUrl } from "@/lib/uploads";
import type { UploadResult } from "@/lib/uploadLimits";
import { welcomeDraftFrom } from "@/lib/welcomeDraft";

/**
 * Server Actions for the welcome message in the clan's admin console. Each begins with `requireAdmin()` (a Server Action can
 * be POSTed directly, without loading the page), the acting user comes only from the verified login session, and the
 * browser-supplied draft is rebuilt field by field before the bot validates its content against Discord's limits.
 */

function outcome<T>(result: ApiResult<T>): WelcomeActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

export async function saveWelcomeAction(input: unknown): Promise<WelcomeActionResult<WelcomeConfig>> {
  const ctx = await requireAdmin("/admin/welcome");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const draft = welcomeDraftFrom(input);
  if (!draft) return { ok: false, error: "That welcome message couldn't be read.", problems: [] };

  const result = await adminApi.saveWelcome(ctx, draft);
  revalidatePath("/admin/welcome");
  return outcome(result);
}

export async function testWelcomeAction(input: unknown): Promise<WelcomeActionResult<{ sent: boolean; channelName: string; dmSent: boolean }>> {
  const ctx = await requireAdmin("/admin/welcome");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const draft = welcomeDraftFrom(input);
  if (!draft) return { ok: false, error: "That welcome message couldn't be read.", problems: [] };

  return outcome(await adminApi.testWelcome(ctx, draft));
}

const SLOTS = ["author_icon", "thumbnail", "image", "footer_icon"];

export async function uploadWelcomeImageAction(slot: string, form: FormData): Promise<UploadResult> {
  const ctx = await requireAdmin("/admin/welcome");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!SLOTS.includes(slot)) return { ok: false, error: "That isn't a place a picture can go.", problems: [] };
  const file = await readUploadedFile(form);
  if (!file.ok) return { ok: false, error: file.error, problems: [] };

  const result = await adminApi.uploadWelcomeImage(ctx, slot, file.base64);
  if (!result.ok) return { ok: false, error: result.error, problems: result.problems };
  return { ok: true, data: { url: uploadedImageUrl(await requestOrigin(), result.data.token, result.data.version) } };
}

export async function removeWelcomeImageAction(slot: string): Promise<WelcomeActionResult<{ removed: boolean }>> {
  const ctx = await requireAdmin("/admin/welcome");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!SLOTS.includes(slot)) return { ok: false, error: "That isn't a place a picture can go.", problems: [] };

  return outcome(await adminApi.removeWelcomeImage(ctx, slot));
}
