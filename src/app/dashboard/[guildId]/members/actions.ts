"use server";

import type { ActionResult } from "@/app/admin/(console)/actions";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type MemberNote } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const text = (v: unknown) => (typeof v === "string" ? v : "");

export async function loadGuildNotesAction(guildId: string, rsn: string): Promise<ActionResult<MemberNote[]>> {
  const guild = await requireGuild(guildId);
  if (!rsn || rsn.length > 40) return { ok: false, error: "That isn't a valid name." };
  const result = await adminApi.notes(guild, rsn);
  return result.ok ? { ok: true, data: result.data.notes } : { ok: false, error: result.error };
}

export async function addGuildNoteAction(guildId: string, rsn: string, note: string): Promise<ActionResult<MemberNote[]>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!rsn || rsn.length > 40) return { ok: false, error: "That isn't a valid name." };
  const result = await adminApi.addNote(guild, rsn, text(note).slice(0, 2000));
  return result.ok ? { ok: true, data: result.data.notes } : { ok: false, error: result.error };
}

export async function deleteGuildNoteAction(guildId: string, id: number, rsn: string): Promise<ActionResult<MemberNote[]>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow };
  if (!Number.isInteger(id) || !rsn || rsn.length > 40) return { ok: false, error: "That note couldn't be found." };
  const result = await adminApi.deleteNote(guild, id, rsn);
  return result.ok ? { ok: true, data: result.data.notes } : { ok: false, error: result.error };
}
