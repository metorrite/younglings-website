"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { throttle } from "@/lib/ratelimit";
import { submitPublicForm, type SubmitResult } from "@/lib/webForms";

/**
 * Sends a filled-in form. The person is whoever is signed in right now: their id comes from the verified login session and never from the form,
 * so nobody can send an answer as someone else. The bot checks the rest (the form is open, they are in the server, the wait between sends).
 */
export async function submitFormAction(guildId: string, formId: string, answers: unknown): Promise<SubmitResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Sign in with Discord to send this form.", problems: [] };
  if (!/^\d{1,20}$/.test(guildId) || !/^\d{1,20}$/.test(formId)) return { ok: false, error: "That form does not exist.", problems: [] };
  const slow = throttle(session.user.id, "form");
  if (slow) return { ok: false, error: slow, problems: [] };
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) return { ok: false, error: "Those answers could not be read.", problems: [] };

  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers as Record<string, unknown>).slice(0, 40)) {
    if (/^[a-z0-9]{1,12}$/.test(key)) clean[key] = typeof value === "string" ? value.slice(0, 2000) : typeof value === "boolean" ? String(value) : "";
  }
  return submitPublicForm(guildId, formId, session.user.id, clean);
}
