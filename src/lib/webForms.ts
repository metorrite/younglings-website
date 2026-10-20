import { botCall } from "@/lib/botCall";
import type { FormQuestion } from "@/lib/jonnybot-admin";

/**
 * The public side of web forms, asked of the bot on behalf of a person signed in with Discord. Server-only (it carries the shared secret through
 * botCall). The person's id must always come from the verified login session, never from the browser.
 */
export interface PublicForm {
  id: string;
  guildId: string;
  guildName: string;
  guildIconUrl: string | null;
  title: string;
  description: string;
  questions: FormQuestion[];
  /** Only present when the person is known. */
  canSubmit?: boolean;
  reason?: string | null;
}

export type PublicFormResult = { ok: true; form: PublicForm } | { ok: false; status: number; error: string };

export async function fetchPublicForm(guildId: string, formId: string, userId: string | null): Promise<PublicFormResult> {
  if (!/^\d{1,20}$/.test(guildId) || !/^\d{1,20}$/.test(formId)) return { ok: false, status: 404, error: "That form does not exist." };
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const answer = await botCall<PublicForm & { error?: string }>(`/internal/forms/${guildId}/${formId}${query}`);
  if (!answer) return { ok: false, status: 0, error: "The form could not be loaded right now. Try again in a moment." };
  if (answer.status !== 200) return { ok: false, status: answer.status, error: answer.json.error ?? "That form does not exist or is closed." };
  return { ok: true, form: answer.json };
}

export type SubmitResult = { ok: true; ticketOpened: boolean; notes: string[] } | { ok: false; error: string; problems: string[] };

export async function submitPublicForm(guildId: string, formId: string, userId: string, answers: Record<string, string>): Promise<SubmitResult> {
  const answer = await botCall<{ error?: string; problems?: string[]; ticketOpened?: boolean; notes?: string[] }>(`/internal/forms/${guildId}/${formId}/submit`, {
    method: "POST",
    body: JSON.stringify({ userId, answers }),
  });
  if (!answer) return { ok: false, error: "The form could not be sent right now. Try again in a moment.", problems: [] };
  if (answer.status !== 200) return { ok: false, error: answer.json.error ?? "The form could not be sent.", problems: answer.json.problems ?? [] };
  return { ok: true, ticketOpened: answer.json.ticketOpened === true, notes: answer.json.notes ?? [] };
}
