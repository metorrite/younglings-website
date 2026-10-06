"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { throttle } from "@/lib/ratelimit";
import { adminApi, type ApiResult, type ClanPoints, type NewsChannelConfig, type SelfRoleConfig } from "@/lib/jonnybot-admin";

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
