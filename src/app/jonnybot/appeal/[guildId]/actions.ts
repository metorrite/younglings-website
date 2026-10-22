"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { appealsApi, type AppealPageView, type AppealResult } from "@/lib/appeals";
import { throttle } from "@/lib/ratelimit";

/** Sends an appeal as the signed-in person (T-033). Who they are comes from the session only; the bot checks the case is theirs. */
export async function sendAppealAction(guildId: string, caseNo: string, text: string): Promise<AppealResult<AppealPageView>> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Sign in with Discord first." };
  const slow = throttle(userId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!/^\d{1,20}$/.test(guildId) || !/^\d{1,19}$/.test(caseNo) || typeof text !== "string") return { ok: false, error: "That appeal couldn't be read." };
  const name = typeof session?.user?.name === "string" ? session.user.name.slice(0, 64) : "";
  return appealsApi.send(guildId, userId, name, caseNo, text.slice(0, 4000));
}
