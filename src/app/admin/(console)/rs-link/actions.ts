"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/admin";
import { throttle } from "@/lib/ratelimit";
import type { ApiResult } from "@/lib/jonnybot-admin";
import { rsnLinkAdmin, subjectProblem, type RsLinkBlock, type RsLinkDispute, type RsLinkSide, type SubjectKind } from "@/lib/rsnLinkAdmin";

/**
 * Server Actions for the RS Link abuse view. Each one starts with requireOwner (a Server Action can be POSTed directly) and rebuilds its
 * arguments field by field; the bot checks the owner again and audits every change.
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const PAGE = "/admin/rs-link";
const KINDS: SubjectKind[] = ["ip", "discord", "tracking", "rsn"];

async function owner() {
  const ctx = await requireOwner(PAGE);
  const slow = throttle(ctx.actorId, "admin");
  return { ctx, slow };
}

function done<T>(result: ApiResult<T>): Result<T> {
  if (result.ok) revalidatePath(PAGE);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function blockSubjectAction(kind: string, value: string, reason: string, hours: number): Promise<Result<{ blocks: RsLinkBlock[] }>> {
  const { ctx, slow } = await owner();
  if (slow) return { ok: false, error: slow };
  const k = KINDS.find((x) => x === kind);
  if (!k) return { ok: false, error: "Choose what to block." };
  const problem = subjectProblem(k, String(value ?? ""));
  if (problem) return { ok: false, error: problem };
  const h = Math.round(Number(hours));
  if (!Number.isFinite(h) || h < 1 || h > 24 * 365) return { ok: false, error: "Block for 1 hour to 365 days." };
  return done(await rsnLinkAdmin.block(ctx, k, String(value).trim(), String(reason ?? "").trim().slice(0, 200), h));
}

export async function unblockAction(id: string): Promise<Result<{ blocks: RsLinkBlock[] }>> {
  const { ctx, slow } = await owner();
  if (slow) return { ok: false, error: slow };
  if (!/^\d{1,19}$/.test(String(id))) return { ok: false, error: "That isn't a block." };
  return done(await rsnLinkAdmin.unblock(ctx, String(id)));
}

export async function resolveDisputeAction(id: string, winner: string, note: string): Promise<Result<{ disputes: RsLinkDispute[] }>> {
  const { ctx, slow } = await owner();
  if (slow) return { ok: false, error: slow };
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return { ok: false, error: "That isn't a dispute." };
  if (winner !== "incumbent" && winner !== "claimant") return { ok: false, error: "Choose who keeps the name." };
  return done(await rsnLinkAdmin.resolve(ctx, String(id), winner, String(note ?? "").trim().slice(0, 200)));
}

export async function searchLinksAction(rsn: string): Promise<Result<{ links: RsLinkSide[] }>> {
  const { ctx, slow } = await owner();
  if (slow) return { ok: false, error: slow };
  const problem = subjectProblem("rsn", String(rsn ?? ""));
  if (problem) return { ok: false, error: problem };
  const result = await rsnLinkAdmin.search(ctx, String(rsn).trim());
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function removeLinkAction(id: string, reason: string): Promise<Result<{ link: RsLinkSide }>> {
  const { ctx, slow } = await owner();
  if (slow) return { ok: false, error: slow };
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return { ok: false, error: "That isn't a link." };
  return done(await rsnLinkAdmin.remove(ctx, String(id), String(reason ?? "").trim().slice(0, 200)));
}

export async function revealDiscordAction(id: string): Promise<Result<{ linkId: string; discordId: string; discordName: string | null }>> {
  const { ctx, slow } = await owner();
  if (slow) return { ok: false, error: slow };
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return { ok: false, error: "That isn't a link." };
  const result = await rsnLinkAdmin.reveal(ctx, String(id));
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}
