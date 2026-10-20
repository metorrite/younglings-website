"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eventsHubOn, joinHubEvent, safeInvite, type HubJoinResult } from "@/lib/hubEvents";
import { throttle } from "@/lib/ratelimit";

/**
 * Joins an event on the events hub as the signed-in person. Who joins comes from the session, never from the browser; the bot applies every rule (listed,
 * visible, in the host's Discord, signups open, team policy, waitlist) and answers in words.
 */
export async function joinHubEventAction(eventId: string): Promise<HubJoinResult> {
  if (!eventsHubOn()) return { ok: false, error: "The events hub isn't open yet." };
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Sign in with Discord first." };
  if (typeof eventId !== "string" || !/^\d{1,18}$/.test(eventId)) return { ok: false, error: "That isn't a valid event." };
  const slow = throttle(userId, "profile");
  if (slow) return { ok: false, error: slow };
  const result = await joinHubEvent(eventId, userId);
  return result.ok ? result : { ...result, inviteUrl: safeInvite(result.inviteUrl) };
}
