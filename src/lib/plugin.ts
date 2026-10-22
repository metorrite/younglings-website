import { botCall } from "@/lib/botCall";
import { hubBaseUrl, hubCall } from "@/lib/hub";

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
  /** With the RSClans hub (HUB_BASE_URL): the bots the player let see their data. Absent without the hub. */
  grants?: HubGrant[];
}

/** One bot the player granted on the hub: which categories, and whether it may see their Discord account. */
export interface HubGrant {
  appId: string;
  appName?: string;
  categories: string[];
  identity: boolean;
  guildIds: string[] | null;
  createdAt: string;
  updatedAt: string;
}

/** What the grant page shows about a bot (from the hub). */
export interface HubAppCard {
  appId: string;
  name: string;
  description: string | null;
  scopes: string[];
  firstParty: boolean;
  categories: { key: string; label: string; description: string }[];
}

/** One of the member's own recent RuneSync events, as stored (the `data` fields depend on the type: XP {skill, xp, level, xpScaled}, DROP {itemName, quantity, valueGp}, KILL {bossName, killCount}, CLUE {tier, count}). */
export interface RuneSyncEvent {
  at: string;
  sourceKind: string | null;
  sourceName: string | null;
  data: Record<string, unknown>;
}

/** What the profile shows about RuneSync (T-202): the member's client, their own latest events per type and their diagnostics ids. */
export interface RuneSyncView {
  client: {
    client: string | null;
    lastSeen: string;
    paused: boolean;
    lastBatchAt: string | null;
    lastBatch: { accepted: number; duplicates: number; rejected: number };
  } | null;
  recent: Record<"XP" | "DROP" | "KILL" | "CLUE", RuneSyncEvent[]>;
  diagnostics: { id: string; createdAt: string; expiresAt: string }[];
  minClientVersion: string;
  diagnosticsKeptDays: number;
}

export type PluginResult<T = PluginView> = { ok: true; data: T } | { ok: false; error: string; code?: string };

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

type HubError = { error?: string; message?: string };

/** One call to the hub's player routes for this Discord user (from the verified session), with the site's web secret. */
async function hubAccount<T>(discordId: string, path: string, method: string, body: Record<string, unknown> = {}): Promise<PluginResult<T>> {
  const answer = await hubCall<T & HubError>(path, { method, body: method === "GET" ? undefined : JSON.stringify({ ...body, discordId }) });
  if (!answer) return { ok: false, error: "The plugin service isn't reachable right now. Try again in a moment." };
  if (answer.status >= 400) return { ok: false, error: answer.json.message ?? answer.json.error ?? "That didn't work.", code: answer.json.error };
  return { ok: true, data: answer.json };
}

type HubPlayer = { characters: { rsn: string }[]; consented: string[]; categories: PluginView["categories"]; grants: HubGrant[]; storedEvents: number };

/**
 * With the RSClans hub, consent, stored events, RuneSync's records and grants live there; plugin tokens (jbp_) and the clan visibility
 * switch stay with the bot. A player with no RS Link character yet has nothing on the hub, which is not an error.
 */
async function hubView(userId: string): Promise<PluginResult<PluginView>> {
  const [bot, hub] = await Promise.all([account<PluginView>(userId, "me", "GET"), hubAccount<HubPlayer>(userId, "/web/players/me", "POST")]);
  const base: PluginView = bot.ok ? bot.data : { tokens: [], rsns: [], consented: [], categories: [], storedEvents: 0, maxTokens: 0 };
  if (!hub.ok) {
    if (hub.code === "not_linked") return { ok: true, data: { ...base, consented: [], storedEvents: 0, grants: [] } };
    return hub;
  }
  const rsns = [...new Set([...hub.data.characters.map((c) => c.rsn), ...base.rsns])];
  const grants = await Promise.all(
    hub.data.grants.map(async (g) => {
      const card = await hubPlayerApi.app(g.appId);
      return { ...g, appName: card.ok ? card.data.name : "A bot that is no longer active" };
    }),
  );
  return { ok: true, data: { ...base, rsns, consented: hub.data.consented, categories: hub.data.categories, storedEvents: hub.data.storedEvents, grants } };
}

/** The hub's player routes, used when HUB_BASE_URL is set (see lib/hub.ts). */
export const hubPlayerApi = {
  app: async (appId: string): Promise<PluginResult<HubAppCard>> => {
    if (!/^[0-9a-f-]{36}$/.test(appId)) return { ok: false, error: "That isn't an app this site knows." };
    const answer = await hubCall<HubAppCard & HubError>(`/web/apps/${appId}`);
    if (!answer) return { ok: false, error: "The plugin service isn't reachable right now. Try again in a moment." };
    if (answer.status >= 400) return { ok: false, error: answer.status === 404 ? "That app doesn't exist or isn't active." : (answer.json.message ?? "That didn't work.") };
    return { ok: true, data: answer.json };
  },
  grant: (userId: string, appId: string, categories: string[], identity: boolean) =>
    hubAccount<HubGrant>(userId, `/web/players/me/grants/${appId}`, "PUT", { categories, identity }),
  revoke: (userId: string, appId: string) => hubAccount<{ revoked: boolean }>(userId, `/web/players/me/grants/${appId}/revoke`, "POST"),
};

export const pluginApi = {
  view: (userId: string) => (hubBaseUrl() ? hubView(userId) : account<PluginView>(userId, "me", "GET")),
  runeSync: (userId: string) => (hubBaseUrl() ? hubAccount<RuneSyncView>(userId, "/web/players/me/runesync", "POST") : account<RuneSyncView>(userId, "me/runesync", "GET")),
  createToken: (userId: string, label: string) => account<PluginView & { token: string; view: PluginView }>(userId, "me/tokens", "POST", { label }),
  revokeToken: (userId: string, tokenId: string) => account<PluginView>(userId, `me/tokens/${encodeURIComponent(tokenId)}`, "DELETE"),
  setConsent: async (userId: string, categories: string[]): Promise<PluginResult> => {
    if (!hubBaseUrl()) return account<PluginView>(userId, "me/consent", "PUT", { categories });
    const saved = await hubAccount<unknown>(userId, "/web/players/me/consent", "PUT", { categories });
    return saved.ok ? hubView(userId) : saved;
  },
  /** "Show my clan that I use RuneSync" (T-140): off until the member switches it on; only then does clan staff see them by name. */
  visibility: (userId: string) => account<{ showToClan: boolean }>(userId, "me/visibility", "GET"),
  setVisibility: (userId: string, showToClan: boolean) => account<{ showToClan: boolean }>(userId, "me/visibility", "PUT", { showToClan }),
  deleteData: async (userId: string): Promise<PluginResult<{ removedEvents: number; view: PluginView }>> => {
    if (!hubBaseUrl()) return account<{ removedEvents: number; view: PluginView }>(userId, "me/data", "DELETE");
    // tokens and choices on the bot, events and RuneSync records on the hub (the RS Link link itself stays)
    const bot = await account<{ removedEvents: number; view: PluginView }>(userId, "me/data", "DELETE");
    const hub = await hubAccount<{ removedEvents: number }>(userId, "/web/players/me/plugin-data/delete", "POST", { confirm: "DELETE" });
    if (!hub.ok && hub.code !== "not_linked") return hub;
    const view = await hubView(userId);
    if (!view.ok) return view;
    return { ok: true, data: { removedEvents: (hub.ok ? hub.data.removedEvents : 0) + (bot.ok ? bot.data.removedEvents : 0), view: view.data } };
  },
};
