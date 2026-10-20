"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { botCall } from "@/lib/botCall";
import { throttle } from "@/lib/ratelimit";

/**
 * Sends a report about an event on the events hub to the bot (T-218). Signing in isn't needed; when someone is signed in their Discord name goes with it so
 * the owner can follow up. Rate-limited per person (or per "anonymous" bucket), and the bot keeps its own per-event flood guard.
 */
export async function reportHubEventAction(eventId: string, reason: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (process.env.EVENTS_HUB !== "true") return { ok: false, error: "The events hub isn't open yet." };
  if (typeof eventId !== "string" || !/^\d{1,18}$/.test(eventId)) return { ok: false, error: "That isn't a valid event." };
  const text = typeof reason === "string" ? reason.trim().slice(0, 500) : "";
  if (text.length < 10) return { ok: false, error: "Say what is wrong, in at least 10 characters." };
  const session = await getServerSession(authOptions);
  const slow = throttle(session?.user?.id ?? "anonymous-hub-report", "profile");
  if (slow) return { ok: false, error: slow };
  const answer = await botCall<{ error?: string }>(`/internal/directory/hub-events/${eventId}/report`, {
    method: "POST",
    body: JSON.stringify({ reason: text, reporter: session?.user?.name ?? null }),
  });
  if (!answer) return { ok: false, error: "That didn't go through. Try again shortly." };
  return answer.status === 202 ? { ok: true } : { ok: false, error: answer.json.error ?? "That didn't go through. Try again shortly." };
}
