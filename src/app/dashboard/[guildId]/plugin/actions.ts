"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** The Clan plugin page's "Allow the in-game clan panel" switch (T-206). The bot checks dashboard access again and audit-logs it. */
export async function saveClanPanelAction(guildId: string, clanPanel: boolean): Promise<{ ok: true; data: { clanPanel: boolean } } | { ok: false; error: string }> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  const result = await adminApi.setPluginSettings(guild, { clanPanel: clanPanel === true });
  revalidatePath(`/dashboard/${guildId}/plugin`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}
