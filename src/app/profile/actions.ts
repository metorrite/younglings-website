"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { setColorRole, setNickname } from "@/lib/jonnybot";

/**
 * Both actions below always source the target user ID from the server-verified login session —
 * never from the submitted form data — since JonnyBot's internal API trusts whatever userId it's
 * given. Accepting that from client input would let anyone rename or recolor an arbitrary member.
 */

export async function updateNicknameAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const raw = formData.get("nickname");
  const nickname = typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;

  await setNickname(session.user.id, nickname);
  revalidatePath("/profile");
}

export async function updateColorRoleAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const raw = formData.get("color");
  const color = typeof raw === "string" && raw !== "" ? raw : null;

  await setColorRole(session.user.id, color);
  revalidatePath("/profile");
}
