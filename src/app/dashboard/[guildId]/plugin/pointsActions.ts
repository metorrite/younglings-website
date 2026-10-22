"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type PluginPointsView } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Saves the Clan plugin page's "Points for plugin reports" (T-061). The rules are rebuilt here and checked again by the bot. */
export async function savePluginPointsAction(guildId: string, rules: PluginPointsView["rules"]): Promise<{ ok: true; data: PluginPointsView } | { ok: false; error: string }> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : 0);
  const clean = (Array.isArray(rules) ? rules : []).slice(0, 20).map((r) => ({
    type: typeof r?.type === "string" ? r.type.slice(0, 30) : "",
    label: "",
    points: num(r?.points),
    dailyCap: num(r?.dailyCap),
    minValueGp: typeof r?.minValueGp === "number" ? num(r.minValueGp) : undefined,
  }));
  const result = await adminApi.setPluginPoints(guild, clean);
  revalidatePath(`/dashboard/${guildId}/plugin`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}
