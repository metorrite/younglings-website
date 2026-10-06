"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminApi, type SignupAdminAction } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Admin actions for the public polls and signups pages. Like every admin action, each begins with
 * `requireAdmin()`: showing the buttons only to admins is a convenience, but a Server Action can be POSTed
 * directly, so the real check is here (and again in the bot). Browser-supplied values are rebuilt field by field
 * before the bot validates their content.
 */

export type CommunityResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const text = (v: unknown) => (typeof v === "string" ? v : "");
const idString = (v: unknown) => (typeof v === "string" && /^\d+$/.test(v) ? v : "");

const ACTIONS: SignupAdminAction[] = ["pause", "clear", "remove", "skip", "removefirst", "pick", "delete"];

export async function createPollAction(input: unknown): Promise<CommunityResult> {
  const ctx = await requireAdmin("/polls");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That poll couldn't be read." };
  const p = input as Record<string, unknown>;

  const result = await adminApi.createPoll(ctx, {
    title: text(p.title),
    options: (Array.isArray(p.options) ? p.options : []).map(text),
    anonymous: p.anonymous === true,
    multiple: p.multiple === true,
    channelId: idString(p.channelId),
  });
  revalidatePath("/polls");
  return result.ok ? { ok: true, data: undefined } : { ok: false, error: result.problems[0] ?? result.error };
}

export async function endPollAction(pollId: string): Promise<CommunityResult> {
  const ctx = await requireAdmin("/polls");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!idString(pollId)) return { ok: false, error: "That isn't a valid poll." };

  const result = await adminApi.endPoll(ctx, pollId);
  revalidatePath("/polls");
  return result.ok ? { ok: true, data: undefined } : { ok: false, error: result.error };
}

export async function createSignupAction(input: unknown): Promise<CommunityResult> {
  const ctx = await requireAdmin("/signups");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That signup couldn't be read." };
  const s = input as Record<string, unknown>;

  const type = s.type === "GROUP" || s.type === "SUBMISSION" ? s.type : "QUEUE";
  const max = typeof s.max === "number" && Number.isFinite(s.max) ? Math.trunc(s.max) : null;
  const fields = (Array.isArray(s.fields) ? s.fields : []).slice(0, 3).map((raw) => {
    const f = (raw ?? {}) as Record<string, unknown>;
    return { label: text(f.label), type: (f.type === "LINK" || f.type === "IMAGE" ? f.type : "TEXT") as "TEXT" | "LINK" | "IMAGE", required: f.required !== false };
  });

  const result = await adminApi.createSignup(ctx, {
    type,
    title: text(s.title),
    note: text(s.note),
    max,
    signupChannelId: idString(s.signupChannelId),
    adminChannelId: idString(s.adminChannelId),
    fields,
  });
  revalidatePath("/signups");
  return result.ok ? { ok: true, data: undefined } : { ok: false, error: result.problems[0] ?? result.error };
}

export async function signupAdminAction(signupId: string, action: string, userId?: string): Promise<CommunityResult<{ winner?: string; paused?: boolean }>> {
  const ctx = await requireAdmin("/signups");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!idString(signupId) || !ACTIONS.includes(action as SignupAdminAction)) return { ok: false, error: "That isn't a valid action." };

  const result = await adminApi.signupAction(ctx, signupId, action as SignupAdminAction, { userId: userId ? idString(userId) : undefined });
  revalidatePath("/signups");
  return result.ok ? { ok: true, data: { winner: result.data.winner, paused: result.data.paused } } : { ok: false, error: result.error };
}
