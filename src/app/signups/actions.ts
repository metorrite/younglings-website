"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { memberApi } from "@/lib/member";

/**
 * Joining and leaving a signup sheet on behalf of the logged-in member. The member is always the id from the
 * verified login session — never anything the browser sends. The bot validates the content (the name, the
 * required answers, links) and whether the sheet is open or full.
 */

type Result = { ok: true; joined: string[] } | { ok: false; error: string };

async function userId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function joinSignupAction(signupId: string, input: { rsn?: unknown; fields?: unknown }): Promise<Result> {
  const id = await userId();
  if (!id) return { ok: false, error: "Log in with Discord to sign up." };
  if (!/^\d+$/.test(signupId)) return { ok: false, error: "That isn't a valid signup." };

  const rsn = typeof input.rsn === "string" ? input.rsn : undefined;
  const fields = Array.isArray(input.fields) ? input.fields.map((f) => (typeof f === "string" ? f : "")) : undefined;

  const result = await memberApi.joinSignup(id, signupId, { rsn, fields });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/signups");
  return { ok: true, joined: result.data.joined };
}

export async function leaveSignupAction(signupId: string): Promise<Result> {
  const id = await userId();
  if (!id) return { ok: false, error: "Log in with Discord first." };
  if (!/^\d+$/.test(signupId)) return { ok: false, error: "That isn't a valid signup." };

  const result = await memberApi.leaveSignup(id, signupId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/signups");
  return { ok: true, joined: result.data.joined };
}
