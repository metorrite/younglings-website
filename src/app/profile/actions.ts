"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { setColorRole, setNickname } from "@/lib/jonnybot";
import { memberApi, type Goal, type MemberSettings, type SelfRole } from "@/lib/member";
import { throttle } from "@/lib/ratelimit";

/**
 * Every action below sources the target user ID from the server-verified login session — never from the
 * submitted data — since JonnyBot's internal API trusts whatever userId it's given. Accepting that from the
 * browser would let anyone change another member's nickname, profile, goals or roles. Arguments from the
 * browser are untrusted too: they're rebuilt field by field here, and the bot validates the content.
 */

async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const signedOut: ActionResult<never> = { ok: false, error: "Your session has expired — log in again." };

// ---------- server nickname and colour (existing) ----------

export async function updateNicknameAction(formData: FormData) {
  const userId = await currentUserId();
  if (!userId || throttle(userId, "profile")) return;

  const raw = formData.get("nickname");
  const nickname = typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;

  await setNickname(userId, nickname);
  revalidatePath("/profile");
}

export async function updateColorRoleAction(formData: FormData) {
  const userId = await currentUserId();
  if (!userId || throttle(userId, "profile")) return;

  const raw = formData.get("color");
  const color = typeof raw === "string" && raw !== "" ? raw : null;

  await setColorRole(userId, color);
  revalidatePath("/profile");
}

// ---------- public profile, privacy and notifications ----------

export async function saveSettingsAction(input: unknown): Promise<ActionResult<MemberSettings>> {
  const userId = await currentUserId();
  if (!userId) return signedOut;
  if (typeof input !== "object" || input === null) return { ok: false, error: "Those settings couldn't be read." };
  const slow = throttle(userId, "profile");
  if (slow) return { ok: false, error: slow };
  const s = input as Record<string, unknown>;

  const pinned = typeof s.pinnedSkill === "number" && Number.isInteger(s.pinnedSkill) ? s.pinnedSkill : null;
  const result = await memberApi.saveSettings(userId, {
    bio: typeof s.bio === "string" ? s.bio : "",
    accentColor: typeof s.accentColor === "string" && s.accentColor !== "" ? s.accentColor : null,
    pinnedSkill: pinned,
    hideAdventureLog: s.hideAdventureLog === true,
    hideFromLeaderboards: s.hideFromLeaderboards === true,
    dmGoals: s.dmGoals !== false,
    dmEvents: s.dmEvents === true,
    hideDiscordLink: s.hideDiscordLink === true,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/profile");
  return { ok: true, data: result.data };
}

// ---------- goals ----------

export async function addGoalAction(skillId: number, targetLevel: number): Promise<ActionResult<Goal[]>> {
  const userId = await currentUserId();
  if (!userId) return signedOut;
  if (!Number.isInteger(skillId) || !Number.isInteger(targetLevel)) return { ok: false, error: "Choose a skill and a level." };
  const slow = throttle(userId, "profile");
  if (slow) return { ok: false, error: slow };

  const result = await memberApi.addGoal(userId, skillId, targetLevel);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/profile");
  return { ok: true, data: result.data.goals };
}

export async function deleteGoalAction(goalId: string): Promise<ActionResult<Goal[]>> {
  const userId = await currentUserId();
  if (!userId) return signedOut;
  if (!/^\d+$/.test(goalId)) return { ok: false, error: "That isn't a valid goal." };
  const slow = throttle(userId, "profile");
  if (slow) return { ok: false, error: slow };

  const result = await memberApi.deleteGoal(userId, goalId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/profile");
  return { ok: true, data: result.data.goals };
}

// ---------- self-assignable roles ----------

export async function toggleRoleAction(roleId: string, on: boolean): Promise<ActionResult<SelfRole[]>> {
  const userId = await currentUserId();
  if (!userId) return signedOut;
  if (!/^\d+$/.test(roleId)) return { ok: false, error: "That isn't a valid role." };
  const slow = throttle(userId, "profile");
  if (slow) return { ok: false, error: slow };

  const result = await memberApi.toggleRole(userId, roleId, on === true);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/profile");
  return { ok: true, data: result.data.roles };
}
