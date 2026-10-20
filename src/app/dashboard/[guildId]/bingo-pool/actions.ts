"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type BingoPoolOverview, type BingoPoolTileInput, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/** Server Actions for the bingo tile pool. Each starts by running `requireGuild`, so a forged server id gets a 404; the bot checks every tile. */

function outcome<T>(result: ApiResult<T>): WelcomeActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

const fail = (error: string): { ok: false; error: string; problems: string[] } => ({ ok: false, error, problems: [] });
const isId = (v: unknown): v is string => typeof v === "string" && /^\d{1,20}$/.test(v);

/** Rebuilds a tile from what the browser sent, field by field. */
function tileFrom(input: unknown): BingoPoolTileInput | null {
  if (typeof input !== "object" || input === null) return null;
  const t = input as Record<string, unknown>;
  const tile: BingoPoolTileInput = { label: typeof t.label === "string" ? t.label.slice(0, 300) : "" };
  if (typeof t.points === "number") tile.points = t.points;
  if (typeof t.target === "number") tile.target = t.target;
  if (typeof t.difficulty === "string") tile.difficulty = t.difficulty.slice(0, 20);
  if (Array.isArray(t.tags)) tile.tags = t.tags.filter((x): x is string => typeof x === "string").slice(0, 12).map((x) => x.slice(0, 60));
  if (typeof t.enabled === "boolean") tile.enabled = t.enabled;
  return tile;
}

async function guarded(guildId: string) {
  const guild = await requireGuild(guildId);
  return { guild, slow: throttle(guild.actorId, "admin") };
}

export async function addBingoTileAction(guildId: string, input: unknown): Promise<WelcomeActionResult<BingoPoolOverview>> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return fail(slow);
  const tile = tileFrom(input);
  if (!tile) return fail("That tile couldn't be read.");
  const result = await adminApi.addBingoTile(guild, tile);
  revalidatePath(`/dashboard/${guildId}/bingo-pool`);
  return outcome(result);
}

export async function saveBingoTileAction(guildId: string, id: string, input: unknown): Promise<WelcomeActionResult<BingoPoolOverview>> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return fail(slow);
  const tile = tileFrom(input);
  if (!tile || !isId(id)) return fail("That tile couldn't be read.");
  const result = await adminApi.saveBingoTile(guild, id, tile);
  revalidatePath(`/dashboard/${guildId}/bingo-pool`);
  return outcome(result);
}

export async function deleteBingoTileAction(guildId: string, id: string): Promise<WelcomeActionResult<BingoPoolOverview>> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return fail(slow);
  if (!isId(id)) return fail("That tile doesn't exist.");
  const result = await adminApi.deleteBingoTile(guild, id);
  revalidatePath(`/dashboard/${guildId}/bingo-pool`);
  return outcome(result);
}

export async function seedBingoPoolAction(guildId: string, pack: string, difficulties: string[]): Promise<WelcomeActionResult<BingoPoolOverview>> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return fail(slow);
  if (typeof pack !== "string" || !Array.isArray(difficulties)) return fail("That couldn't be read.");
  const result = await adminApi.seedBingoPool(guild, pack.slice(0, 40), difficulties.filter((d): d is string => typeof d === "string").slice(0, 8).map((d) => d.slice(0, 20)));
  revalidatePath(`/dashboard/${guildId}/bingo-pool`);
  return outcome(result);
}

export async function clearBingoPoolAction(guildId: string, pack: string | null): Promise<WelcomeActionResult<BingoPoolOverview>> {
  const { guild, slow } = await guarded(guildId);
  if (slow) return fail(slow);
  const result = await adminApi.clearBingoPool(guild, typeof pack === "string" ? pack.slice(0, 40) : null);
  revalidatePath(`/dashboard/${guildId}/bingo-pool`);
  return outcome(result);
}
