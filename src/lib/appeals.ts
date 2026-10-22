import { botCall } from "@/lib/botCall";

/** One of the signed-in person's cases they can appeal (T-033): theirs only, never anyone else's. */
export interface AppealableCase {
  caseNo: string;
  action: "BAN" | "TIMEOUT";
  label: string;
  reason: string;
  durationMinutes: number | null;
  createdAt: string;
  canAppeal: boolean;
  /** Why they can't appeal it right now (one is waiting, or a recent one was turned down), or null. */
  why: string | null;
}

export interface MyAppeal {
  id: string;
  caseNo: string;
  status: "OPEN" | "APPROVED" | "REJECTED";
  text: string;
  createdAt: string;
  decidedAt: string | null;
  /** Staff's reason when it was turned down (or their note when approved). */
  note: string | null;
}

/** What the appeal page shows the signed-in person for one server. */
export interface AppealPageView {
  server: { id: string; name: string; iconUrl: string | null };
  enabled: boolean;
  cases: AppealableCase[];
  appeals: MyAppeal[];
  minText?: number;
  maxText?: number;
}

export type AppealResult<T> = { ok: true; data: T } | { ok: false; error: string; notFound?: boolean };

type BotError = { error?: string };

/** The bot's appeal routes for one person. `userId` must come from the verified session, never from the browser. */
export const appealsApi = {
  async view(guildId: string, userId: string): Promise<AppealResult<AppealPageView>> {
    if (!/^\d{1,20}$/.test(guildId)) return { ok: false, error: "That server doesn't exist.", notFound: true };
    const answer = await botCall<AppealPageView & BotError>(`/internal/appeals/${guildId}?userId=${encodeURIComponent(userId)}`, { method: "GET" });
    if (!answer) return { ok: false, error: "JonnyBot isn't reachable right now. Try again in a moment." };
    if (answer.status === 404) return { ok: false, error: answer.json.error ?? "That server doesn't exist.", notFound: true };
    if (answer.status >= 400) return { ok: false, error: answer.json.error ?? "That didn't work." };
    return { ok: true, data: answer.json };
  },

  async send(guildId: string, userId: string, userName: string, caseNo: string, text: string): Promise<AppealResult<AppealPageView>> {
    const answer = await botCall<{ view: AppealPageView } & BotError>(`/internal/appeals/${guildId}`, {
      method: "POST",
      body: JSON.stringify({ userId, userName, caseNo, text }),
    });
    if (!answer) return { ok: false, error: "JonnyBot isn't reachable right now. Try again in a moment." };
    if (answer.status >= 400) return { ok: false, error: answer.json.error ?? "That didn't work." };
    return { ok: true, data: answer.json.view };
  },
};
