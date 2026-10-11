import { botCall } from "@/lib/botCall";

/** What a signed-in player sees about their plugin connection. Tokens are never included, only a short preview. */
export interface PluginView {
  tokens: { id: string; label: string; preview: string; createdAt: string; lastUsedAt: string | null; revoked: boolean }[];
  /** The RuneScape names linked to this player in JonnyBot: the ones the plugin may report for. */
  rsns: string[];
  /** The categories the player has switched on. */
  consented: string[];
  categories: { key: string; label: string; description: string }[];
  storedEvents: number;
  maxTokens: number;
}

export type PluginResult<T = PluginView> = { ok: true; data: T } | { ok: false; error: string };

type BotError = { error?: string };

/** One call to the bot's plugin account API for this user (the id must come from the verified session, never from the browser). */
async function account<T>(userId: string, path: string, method: string, body?: unknown): Promise<PluginResult<T>> {
  const withUser = method === "GET" || method === "DELETE" ? `${path}${path.includes("?") ? "&" : "?"}userId=${encodeURIComponent(userId)}` : path;
  const answer = await botCall<T & BotError>(`/internal/plugin/${withUser}`, {
    method,
    body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify({ ...(body as object), userId }),
  });
  if (!answer) return { ok: false, error: "JonnyBot isn't reachable right now. Try again in a moment." };
  if (answer.status >= 400) return { ok: false, error: answer.json.error ?? "That didn't work." };
  return { ok: true, data: answer.json };
}

export const pluginApi = {
  view: (userId: string) => account<PluginView>(userId, "me", "GET"),
  createToken: (userId: string, label: string) => account<PluginView & { token: string; view: PluginView }>(userId, "me/tokens", "POST", { label }),
  revokeToken: (userId: string, tokenId: string) => account<PluginView>(userId, `me/tokens/${encodeURIComponent(tokenId)}`, "DELETE"),
  setConsent: (userId: string, categories: string[]) => account<PluginView>(userId, "me/consent", "PUT", { categories }),
  deleteData: (userId: string) => account<{ removedEvents: number; view: PluginView }>(userId, "me/data", "DELETE"),
};
