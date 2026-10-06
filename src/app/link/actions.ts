"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { memberApi, type LinkResult } from "@/lib/member";
import { throttle } from "@/lib/ratelimit";

/**
 * Linking a RuneScape name. The Discord user is read from the verified login session — never from what the browser
 * sent — because JonnyBot's member API acts on whichever id it is given.
 */

export type LinkActionResult = { ok: true; data: LinkResult } | { ok: false; error: string };

export async function submitLinkAction(rsn: string): Promise<LinkActionResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Your session has expired — log in again." };
  const slow = throttle(userId, "profile");
  if (slow) return { ok: false, error: slow };
  if (typeof rsn !== "string") return { ok: false, error: "Type your RuneScape name." };

  const result = await memberApi.submitLink(userId, rsn.trim().slice(0, 40));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/", "layout"); // the navbar badge and the profile pages all depend on this
  return { ok: true, data: result.data };
}

export async function cancelLinkAction(): Promise<LinkActionResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Your session has expired — log in again." };
  const slow = throttle(userId, "profile");
  if (slow) return { ok: false, error: slow };

  const result = await memberApi.cancelLink(userId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/", "layout");
  return { ok: true, data: result.data };
}
