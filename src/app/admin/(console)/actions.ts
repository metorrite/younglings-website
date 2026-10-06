"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { throttle } from "@/lib/ratelimit";
import { adminApi, type ApiResult, type ClanPoints, type MemberNote, type NewsChannelConfig, type PromotionDue, type ScheduledPost, type SelfRoleConfig } from "@/lib/jonnybot-admin";

/**
 * Server Actions for the admin settings that aren't tickets. Like every admin action, each begins with
 * `requireAdmin()` — a Server Action can be POSTed directly without loading a page — and rebuilds its
 * browser-supplied arguments field by field before the bot validates the content.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function outcome<T>(result: ApiResult<T>): ActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

const text = (v: unknown) => (typeof v === "string" ? v : "");
const wholeNumber = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : 0);

export async function saveSelfRolesAction(input: unknown): Promise<ActionResult<SelfRoleConfig[]>> {
  const ctx = await requireAdmin("/admin/roles");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!Array.isArray(input)) return { ok: false, error: "Those roles couldn't be read." };

  const roles = input
    .map((raw) => (raw ?? {}) as Record<string, unknown>)
    .filter((r) => typeof r.roleId === "string" && /^\d+$/.test(r.roleId))
    .map((r) => ({ roleId: r.roleId as string, label: text(r.label), description: text(r.description) }));

  const result = await adminApi.saveSelfRoles(ctx, roles);
  revalidatePath("/admin/roles");
  revalidatePath("/profile");
  return result.ok ? { ok: true, data: result.data.roles } : { ok: false, error: result.problems[0] ?? result.error };
}

export async function markPromotedAction(rsn: string): Promise<ActionResult<PromotionDue[]>> {
  const ctx = await requireAdmin("/admin/promotions");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!rsn || rsn.length > 40) return { ok: false, error: "That isn't a valid name." };

  const result = await adminApi.markPromoted(ctx, rsn);
  revalidatePath("/admin/promotions");
  return result.ok ? { ok: true, data: result.data.members } : { ok: false, error: result.error };
}

export async function saveTrackingAction(key: string, enabled: boolean, channelIds: string[]): Promise<ActionResult<undefined>> {
  const ctx = await requireAdmin("/admin/tracking");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!/^[A-Z_]+$/.test(key)) return { ok: false, error: "That isn't a tracking group." };

  const result = await adminApi.saveTracking(ctx, key, { enabled: enabled === true, channelIds: (Array.isArray(channelIds) ? channelIds : []).filter((c) => /^\d+$/.test(c)) });
  revalidatePath("/admin/tracking");
  return result.ok ? { ok: true, data: undefined } : { ok: false, error: result.problems[0] ?? result.error };
}

export async function postMessageAction(input: unknown): Promise<{ ok: true; data: { warnings: string[] } } | { ok: false; error: string; problems: string[] }> {
  const ctx = await requireAdmin("/admin/post");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That message couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;

  const result = await adminApi.post(ctx, {
    text: text(p.text),
    channelId: typeof p.channelId === "string" && /^\d+$/.test(p.channelId) ? p.channelId : undefined,
    convert: p.convert === true,
    dryRun: p.dryRun === true,
  });
  return result.ok ? { ok: true, data: { warnings: result.data.warnings } } : { ok: false, error: result.error, problems: result.problems };
}

export async function saveCommunityAction(pollChannelId: string | null): Promise<ActionResult<undefined>> {
  const ctx = await requireAdmin("/admin/community");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };

  const result = await adminApi.saveCommunity(ctx, pollChannelId && /^\d+$/.test(pollChannelId) ? pollChannelId : null);
  revalidatePath("/admin/community");
  return result.ok ? { ok: true, data: undefined } : { ok: false, error: result.problems[0] ?? result.error };
}

export async function saveNewsChannelsAction(input: unknown): Promise<ActionResult<NewsChannelConfig[]>> {
  const ctx = await requireAdmin("/admin/news");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!Array.isArray(input)) return { ok: false, error: "Those channels couldn't be read." };

  const channels = input
    .map((raw) => (raw ?? {}) as Record<string, unknown>)
    .filter((c) => typeof c.channelId === "string" && /^\d+$/.test(c.channelId))
    .map((c) => ({ channelId: c.channelId as string, label: text(c.label) }));

  const result = await adminApi.saveNewsChannels(ctx, channels);
  revalidatePath("/admin/news");
  revalidatePath("/");
  return result.ok ? { ok: true, data: result.data.channels } : { ok: false, error: result.problems[0] ?? result.error };
}

export async function saveClanPointsAction(input: unknown): Promise<ActionResult<ClanPoints>> {
  const ctx = await requireAdmin("/admin/clan");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read." };
  const s = input as Record<string, unknown>;

  const ranks = (Array.isArray(s.ranks) ? s.ranks : [])
    .map((raw) => (raw ?? {}) as Record<string, unknown>)
    .filter((r) => typeof r.id === "string" && /^\d+$/.test(r.id))
    .map((r) => ({ id: r.id as string, threshold: wholeNumber(r.threshold) }));

  const result = await adminApi.saveClanPoints(ctx, {
    dailyMembershipPoints: wholeNumber(s.dailyMembershipPoints),
    citadelVisitPoints: wholeNumber(s.citadelVisitPoints),
    citadelCapPoints: wholeNumber(s.citadelCapPoints),
    ranks,
  });
  revalidatePath("/admin/clan");
  return outcome(result);
}

// ---------- member notes ----------

export async function loadNotesAction(rsn: string): Promise<ActionResult<MemberNote[]>> {
  const ctx = await requireAdmin("/admin/members");
  if (!rsn || rsn.length > 40) return { ok: false, error: "That isn't a valid name." };
  const result = await adminApi.notes(ctx, rsn);
  return result.ok ? { ok: true, data: result.data.notes } : { ok: false, error: result.error };
}

export async function addNoteAction(rsn: string, note: string): Promise<ActionResult<MemberNote[]>> {
  const ctx = await requireAdmin("/admin/members");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!rsn || rsn.length > 40) return { ok: false, error: "That isn't a valid name." };
  const result = await adminApi.addNote(ctx, rsn, text(note).slice(0, 2000));
  if (result.ok) revalidatePath("/admin/members");
  return result.ok ? { ok: true, data: result.data.notes } : { ok: false, error: result.error };
}

export async function deleteNoteAction(id: number, rsn: string): Promise<ActionResult<MemberNote[]>> {
  const ctx = await requireAdmin("/admin/members");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!Number.isInteger(id) || !rsn || rsn.length > 40) return { ok: false, error: "That note couldn't be found." };
  const result = await adminApi.deleteNote(ctx, id, rsn);
  if (result.ok) revalidatePath("/admin/members");
  return result.ok ? { ok: true, data: result.data.notes } : { ok: false, error: result.error };
}

// ---------- scheduled posts ----------

export async function schedulePostAction(input: unknown): Promise<ActionResult<ScheduledPost[]>> {
  const ctx = await requireAdmin("/admin/scheduled");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  const raw = (input ?? {}) as Record<string, unknown>;
  const channelId = text(raw.channelId);
  if (!/^\d+$/.test(channelId)) return { ok: false, error: "Choose a channel." };
  const sendAt = text(raw.sendAt);
  if (Number.isNaN(Date.parse(sendAt))) return { ok: false, error: "Pick when it should be posted." };

  const result = await adminApi.schedulePost(ctx, { text: text(raw.text), channelId, convert: raw.convert === true, sendAt: new Date(sendAt).toISOString() });
  if (!result.ok) return { ok: false, error: result.problems[0] ?? result.error };
  revalidatePath("/admin/scheduled");
  const list = await adminApi.scheduled(ctx);
  return list.ok ? { ok: true, data: list.data.posts } : { ok: false, error: list.error };
}

export async function cancelScheduledAction(id: number): Promise<ActionResult<ScheduledPost[]>> {
  const ctx = await requireAdmin("/admin/scheduled");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!Number.isInteger(id)) return { ok: false, error: "That post couldn't be found." };
  const result = await adminApi.cancelScheduled(ctx, id);
  if (result.ok) revalidatePath("/admin/scheduled");
  return result.ok ? { ok: true, data: result.data.posts } : { ok: false, error: result.error };
}
