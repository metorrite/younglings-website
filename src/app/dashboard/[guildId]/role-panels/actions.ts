"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type RolePanelButton, type RolePanelDef, type RolePanelList, type WelcomeActionResult } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const STYLES = ["primary", "secondary", "success", "danger"] as const;

/** Rebuilds a panel from untrusted input; the bot validates the content (roles that exist, lengths) and explains any refusal. */
function clean(input: unknown): Omit<RolePanelDef, "id" | "posted" | "channelId" | "messageId" | "attached"> | null {
  if (typeof input !== "object" || input === null) return null;
  const p = input as Record<string, unknown>;
  const buttons: RolePanelButton[] = (Array.isArray(p.buttons) ? p.buttons : []).slice(0, 25).map((raw) => {
    const b = (raw ?? {}) as Record<string, unknown>;
    return {
      roleId: typeof b.roleId === "string" ? b.roleId : "",
      label: text(b.label, 100),
      emoji: typeof b.emoji === "string" && b.emoji.trim() !== "" ? b.emoji.trim().slice(0, 64) : null,
      style: STYLES.includes(b.style as (typeof STYLES)[number]) ? (b.style as RolePanelButton["style"]) : "primary",
    };
  });
  return {
    name: text(p.name, 100),
    title: text(p.title, 300),
    description: text(p.description, 4100),
    color: typeof p.color === "number" && Number.isFinite(p.color) ? Math.trunc(p.color) : null,
    mode: p.mode === "UNIQUE" ? "UNIQUE" : "TOGGLE",
    style: p.style === "DROPDOWN" || p.style === "REACTIONS" ? p.style : "BUTTONS",
    rule: p.rule === "ADD_ONLY" || p.rule === "REMOVE_ONLY" ? p.rule : "NORMAL",
    buttons,
  };
}

/** Creates the panel when `panelId` is null, otherwise replaces its text and buttons. Like every dashboard action it checks the user against *that* server first. */
export async function saveGuildRolePanelAction(guildId: string, panelId: string | null, input: unknown): Promise<WelcomeActionResult<RolePanelDef>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const panel = clean(input);
  if (!panel) return { ok: false, error: "That panel couldn't be read.", problems: [] };
  if (panelId !== null && !/^\d+$/.test(panelId)) return { ok: false, error: "That isn't a valid panel.", problems: [] };

  const result = panelId === null ? await adminApi.createRolePanel(guild, panel) : await adminApi.updateRolePanel(guild, panelId, panel);
  revalidatePath(`/dashboard/${guildId}/role-panels`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

export async function deleteGuildRolePanelAction(guildId: string, panelId: string): Promise<WelcomeActionResult<RolePanelList>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d+$/.test(panelId)) return { ok: false, error: "That isn't a valid panel.", problems: [] };

  const result = await adminApi.deleteRolePanel(guild, panelId);
  revalidatePath(`/dashboard/${guildId}/role-panels`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

/** Posts the panel in a channel, or puts a reactions panel on an existing message by its link. */
export async function postGuildRolePanelAction(guildId: string, panelId: string, target: { channelId?: string; messageLink?: string }): Promise<WelcomeActionResult<RolePanelDef>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d+$/.test(panelId)) return { ok: false, error: "That isn't a valid panel.", problems: [] };
  const messageLink = typeof target?.messageLink === "string" ? target.messageLink.trim().slice(0, 200) : "";
  const channelId = typeof target?.channelId === "string" ? target.channelId : "";
  if (messageLink === "" && !/^\d+$/.test(channelId)) return { ok: false, error: "Choose a channel to post in.", problems: [] };

  const result = await adminApi.postRolePanel(guild, panelId, messageLink !== "" ? { messageLink } : { channelId });
  revalidatePath(`/dashboard/${guildId}/role-panels`);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}
