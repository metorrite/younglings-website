"use server";

import { revalidatePath } from "next/cache";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type ApiResult, type WebFormList, type WebFormSubmissions } from "@/lib/jonnybot-admin";
import { throttle } from "@/lib/ratelimit";

/**
 * Server Actions for the form builder. Each begins with `requireGuild(guildId)` (a Server Action can be POSTed directly), the form id is only
 * ever used together with that server on the bot side, and the browser-supplied form is rebuilt field by field before the bot validates it.
 */
export type FormActionResult<T> = { ok: true; data: T } | { ok: false; error: string; problems: string[] };

function outcome<T>(result: ApiResult<T>): FormActionResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error, problems: result.problems };
}

const KINDS = new Set(["SHORT", "PARAGRAPH", "CHOICE", "CHECKBOX", "RSN"]);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const idOrNull = (v: unknown) => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);
const whole = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : fallback);

export async function createFormAction(guildId: string, template: string | null): Promise<FormActionResult<WebFormList>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  const result = await adminApi.createWebForm(guild, template === "clan-application" ? template : null);
  revalidatePath(`/dashboard/${guildId}/forms`);
  return outcome(result);
}

export async function saveFormAction(guildId: string, formId: string, input: unknown): Promise<FormActionResult<WebFormList>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d{1,20}$/.test(formId)) return { ok: false, error: "That form does not exist.", problems: [] };
  if (typeof input !== "object" || input === null) return { ok: false, error: "That form could not be read.", problems: [] };
  const f = input as Record<string, unknown>;

  const questions = (Array.isArray(f.questions) ? f.questions : []).slice(0, 40).map((raw) => {
    const q = (raw ?? {}) as Record<string, unknown>;
    return {
      id: text(q.id, 12),
      label: text(q.label, 200),
      kind: typeof q.kind === "string" && KINDS.has(q.kind) ? q.kind : "SHORT",
      required: q.required === true,
      options: (Array.isArray(q.options) ? q.options : []).slice(0, 40).map((o) => text(o, 200)),
      maxLength: whole(q.maxLength, 300),
    };
  });

  const result = await adminApi.saveWebForm(guild, formId, {
    name: text(f.name, 200),
    title: text(f.title, 300),
    description: text(f.description, 3000),
    enabled: f.enabled === true,
    panelId: idOrNull(f.panelId),
    channelId: idOrNull(f.channelId),
    roleId: idOrNull(f.roleId),
    onePerUser: f.onePerUser === true,
    cooldownHours: whole(f.cooldownHours, 0),
    questions,
  });
  revalidatePath(`/dashboard/${guildId}/forms`);
  return outcome(result);
}

export async function deleteFormAction(guildId: string, formId: string): Promise<FormActionResult<WebFormList>> {
  const guild = await requireGuild(guildId);
  const slow = throttle(guild.actorId, "admin");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (!/^\d{1,20}$/.test(formId)) return { ok: false, error: "That form does not exist.", problems: [] };
  const result = await adminApi.deleteWebForm(guild, formId);
  revalidatePath(`/dashboard/${guildId}/forms`);
  return outcome(result);
}

export async function formSubmissionsAction(guildId: string, formId: string): Promise<FormActionResult<WebFormSubmissions>> {
  const guild = await requireGuild(guildId);
  if (!/^\d{1,20}$/.test(formId)) return { ok: false, error: "That form does not exist.", problems: [] };
  return outcome(await adminApi.webFormSubmissions(guild, formId));
}
