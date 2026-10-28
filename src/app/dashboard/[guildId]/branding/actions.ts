"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type BotBranding, type BrandingSave, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** A picture arrives as a data URL from the browser; keep it only if it is one and not absurdly large (the bot checks the real limits). */
const picture = (value: unknown): string | undefined => (typeof value === "string" && value.startsWith("data:image/") && value.length < 3_500_000 ? value : undefined);

/** Saves how JonnyBot appears in a server. Like every dashboard action it starts by checking the user against *that* server. */
export async function saveGuildBrandingAction(guildId: string, input: unknown): Promise<WelcomeActionResult<BotBranding>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That couldn't be read.", problems: [] };
  const p = input as Record<string, unknown>;

  // Only what was sent is changed: an absent field is left alone on the bot.
  const body: BrandingSave = {};
  if ("displayName" in p) body.displayName = typeof p.displayName === "string" ? p.displayName.slice(0, 80) : null;
  if ("nickname" in p) body.nickname = typeof p.nickname === "string" ? p.nickname.slice(0, 80) : null;
  if ("bio" in p) body.bio = typeof p.bio === "string" ? p.bio.slice(0, 400) : null;
  const avatar = picture(p.avatar);
  const banner = picture(p.banner);
  if (avatar) body.avatar = avatar;
  if (banner) body.banner = banner;
  if (p.removeAvatar === true) body.removeAvatar = true;
  if (p.removeBanner === true) body.removeBanner = true;

  const result = await adminApi.saveBranding(guild, body);
  revalidatePath(`/dashboard/${guildId}/branding`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
