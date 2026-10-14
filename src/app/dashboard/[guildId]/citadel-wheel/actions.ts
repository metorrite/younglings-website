"use server";

import { requireGuild } from "@/lib/dashboard";
import type { CitadelCappers } from "@/lib/citadelTypes";
import { adminApi } from "@/lib/jonnybot-admin";

/** Who capped in the week that ended on `end` (a Wednesday, YYYY-MM-DD), or the week that just finished when `end` is null. Starts by checking the user against that server. */
export async function citadelCappersAction(
  guildId: string,
  end: string | null,
): Promise<{ ok: true; data: CitadelCappers } | { ok: false; error: string }> {
  const guild = await requireGuild(guildId);
  if (end !== null && !/^\d{4}-\d{2}-\d{2}$/.test(end)) return { ok: false, error: "That isn't a date." };
  const result = await adminApi.citadelCappers(guild, end);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}
