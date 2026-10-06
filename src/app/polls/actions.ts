"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { memberApi } from "@/lib/member";
import { throttle } from "@/lib/ratelimit";

/**
 * Votes on behalf of the logged-in member. The voter is always the id from the verified login session — never
 * anything the browser sends — because JonnyBot's internal API trusts the id it's given. The bot itself checks
 * the poll is open and that the voter is a verified clan member.
 */
/** A verified member starts a poll in the channel the admins chose for member polls. */
export async function createMemberPollAction(input: unknown): Promise<{ ok: true; channel: string } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Log in with Discord to start a poll." };
  const slow = throttle(session.user.id, "signup");
  if (slow) return { ok: false, error: slow };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That poll couldn't be read." };
  const p = input as Record<string, unknown>;

  const result = await memberApi.createPoll(session.user.id, {
    title: typeof p.title === "string" ? p.title : "",
    options: (Array.isArray(p.options) ? p.options : []).map((o) => (typeof o === "string" ? o : "")),
    anonymous: p.anonymous === true,
    multiple: p.multiple === true,
    durationHours: typeof p.durationHours === "number" && Number.isFinite(p.durationHours) && p.durationHours > 0 ? Math.trunc(p.durationHours) : null,
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/polls");
  return { ok: true, channel: result.data.channel };
}

export async function votePollAction(pollId: string, optionNumber: number): Promise<{ ok: true; mine: number[] } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Log in with Discord to vote." };
  if (!/^\d+$/.test(pollId) || !Number.isInteger(optionNumber)) return { ok: false, error: "That isn't a valid option." };
  const slow = throttle(session.user.id, "vote");
  if (slow) return { ok: false, error: slow };

  const result = await memberApi.vote(session.user.id, pollId, optionNumber);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/polls");
  return { ok: true, mine: result.data.polls.find((p) => p.pollId === pollId)?.mine ?? [] };
}
