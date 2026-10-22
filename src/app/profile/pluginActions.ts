"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { hubPlayerApi, pluginApi, type PluginResult, type PluginView } from "@/lib/plugin";
import { throttle } from "@/lib/ratelimit";

/**
 * Every action takes the user id from the verified sign-in, never from what the browser sends: the bot trusts the id it is given.
 * The categories and label from the browser are rebuilt here and checked again by the bot.
 */
async function userId(): Promise<string | null> {
  return (await getServerSession(authOptions))?.user?.id ?? null;
}

const signedOut = { ok: false as const, error: "Your session has expired. Sign in again." };
const slow = (id: string) => throttle(id, "profile");

export async function createPluginTokenAction(label: string): Promise<PluginResult<{ token: string; view: PluginView }>> {
  const id = await userId();
  if (!id) return signedOut;
  const busy = slow(id);
  if (busy) return { ok: false, error: busy };
  const result = await pluginApi.createToken(id, typeof label === "string" ? label.slice(0, 60) : "");
  if (!result.ok) return result;
  revalidatePath("/profile");
  return { ok: true, data: { token: result.data.token, view: result.data.view } };
}

export async function revokePluginTokenAction(tokenId: string): Promise<PluginResult> {
  const id = await userId();
  if (!id) return signedOut;
  const busy = slow(id);
  if (busy) return { ok: false, error: busy };
  if (typeof tokenId !== "string" || !/^\d+$/.test(tokenId)) return { ok: false, error: "That isn't a valid token." };
  const result = await pluginApi.revokeToken(id, tokenId);
  revalidatePath("/profile");
  return result;
}

export async function savePluginConsentAction(categories: string[]): Promise<PluginResult> {
  const id = await userId();
  if (!id) return signedOut;
  const busy = slow(id);
  if (busy) return { ok: false, error: busy };
  const clean = Array.isArray(categories) ? categories.filter((c): c is string => typeof c === "string").slice(0, 12) : [];
  const result = await pluginApi.setConsent(id, clean);
  revalidatePath("/profile");
  return result;
}

export async function savePluginVisibilityAction(showToClan: boolean): Promise<PluginResult<{ showToClan: boolean }>> {
  const id = await userId();
  if (!id) return signedOut;
  const busy = slow(id);
  if (busy) return { ok: false, error: busy };
  const result = await pluginApi.setVisibility(id, showToClan === true);
  revalidatePath("/profile");
  return result;
}

/** With the RuneClans hub: stop one bot seeing the player's plugin data (T-163). Answers the refreshed view. */
export async function revokeBotGrantAction(appId: string): Promise<PluginResult> {
  const id = await userId();
  if (!id) return signedOut;
  const busy = slow(id);
  if (busy) return { ok: false, error: busy };
  if (typeof appId !== "string" || !/^[0-9a-f-]{36}$/.test(appId)) return { ok: false, error: "That isn't a bot this site knows." };
  const result = await hubPlayerApi.revoke(id, appId);
  if (!result.ok) return result;
  revalidatePath("/profile");
  return pluginApi.view(id);
}

export async function deletePluginDataAction(): Promise<PluginResult<{ removedEvents: number; view: PluginView }>> {
  const id = await userId();
  if (!id) return signedOut;
  const busy = slow(id);
  if (busy) return { ok: false, error: busy };
  const result = await pluginApi.deleteData(id);
  revalidatePath("/profile");
  return result;
}
