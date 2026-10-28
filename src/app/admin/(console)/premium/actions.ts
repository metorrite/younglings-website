"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminApi, type PremiumGrantInput, type PremiumGuilds, type PremiumHistory } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Server Actions for the Premium page. The bot only lets its owner grant, change or revoke a plan, whatever the website shows. There are no prices and no
 * payments anywhere: a plan is granted by hand.
 */
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const GUILD_ID = /^\d{15,20}$/;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function savePremiumGrantAction(guildId: string, input: unknown): Promise<ActionResult<PremiumGuilds>> {
  const ctx = await requireAdmin("/admin/premium");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (typeof guildId !== "string" || !GUILD_ID.test(guildId.trim())) return { ok: false, error: "A Discord server ID is 17 to 20 digits." };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That couldn't be read." };
  const p = input as Record<string, unknown>;
  const grant: PremiumGrantInput = { label: text(p.label, 60), tier: text(p.tier, 20), expiresAt: text(p.expiresAt, 40), note: text(p.note, 300), source: text(p.source, 20) };
  const result = await adminApi.savePremiumGuild(ctx, guildId.trim(), grant);
  if (result.ok) revalidatePath("/admin/premium");
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function removePremiumGrantAction(guildId: string): Promise<ActionResult<PremiumGuilds>> {
  const ctx = await requireAdmin("/admin/premium");
  const slow = throttle(ctx.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (typeof guildId !== "string" || !GUILD_ID.test(guildId.trim())) return { ok: false, error: "That isn't a server ID." };
  const result = await adminApi.removePremiumGuild(ctx, guildId.trim());
  if (result.ok) revalidatePath("/admin/premium");
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function premiumHistoryAction(guildId: string): Promise<ActionResult<PremiumHistory>> {
  const ctx = await requireAdmin("/admin/premium");
  if (typeof guildId !== "string" || !GUILD_ID.test(guildId.trim())) return { ok: false, error: "That isn't a server ID." };
  const result = await adminApi.premiumHistory(ctx, guildId.trim());
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}
