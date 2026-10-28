"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type ClanSiteAdmin, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Server Actions for the Clan website page. Each starts by checking the signed-in user against *that* server; the bot checks every value again. */

type Result = WelcomeActionResult<ClanSiteAdmin>;
const fail = (error: string): Result => ({ ok: false, error, problems: [] });
const done = (guildId: string, result: ApiResult<ClanSiteAdmin>): Result => {
  revalidatePath(`/dashboard/${guildId}/clan-website`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
};
const record = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export async function saveClanSiteAction(guildId: string, input: unknown): Promise<Result> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  const p = record(input);
  const template = p.template === "HALL" || p.template === "MINIMAL" ? p.template : "CLASSIC";
  return done(guildId, await adminApi.saveClanSite(guild, { enabled: p.enabled === true, template, theme: record(p.theme), pages: Array.isArray(p.pages) ? p.pages.slice(0, 20) : [] }));
}

export async function saveClanSiteBlocksAction(guildId: string, page: string, input: unknown): Promise<Result> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  if (!/^[a-z0-9]{1,20}$/.test(page)) return fail("That page can't have blocks.");
  const blocks = (Array.isArray(input) ? input : []).slice(0, 25).map((b) => {
    const r = record(b);
    return { kind: (r.kind === "IMAGE" || r.kind === "LINKS" ? r.kind : "TEXT") as "TEXT" | "IMAGE" | "LINKS", body: record(r.body) };
  });
  return done(guildId, await adminApi.saveClanSiteBlocks(guild, page, blocks));
}

export async function publishClanSiteAction(guildId: string, publish: boolean): Promise<Result> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  return done(guildId, await adminApi.publishClanSite(guild, publish === true));
}

/** The bot's owner takes the site down with a reason (or restores it with `null`); the bot refuses anyone else. */
export async function takedownClanSiteAction(guildId: string, reason: string | null): Promise<Result> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return fail(slow);
  return done(guildId, await adminApi.takedownClanSite(guild, typeof reason === "string" ? reason.slice(0, 300) : null));
}
