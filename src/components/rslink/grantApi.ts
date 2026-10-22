/**
 * The grant page's calls (T-163): which bots may see the signed-in player's plugin data on the RSClans hub. Separate from `LinkApi` so the
 * link pages and their preview fakes don't change. Uses the same `/api/link/web/*` session and CSRF token (call `realLinkApi.state()` first).
 */
import { realLinkApi, type Answer } from "./linkApi";

export interface GrantApp {
  appId: string;
  name: string;
  description: string | null;
  scopes: string[];
  firstParty: boolean;
  categories: { key: string; label: string; description: string }[];
}

export interface GrantRow {
  appId: string;
  appName: string;
  categories: string[];
  identity: boolean;
  guildIds: string[] | null;
  createdAt: string;
  updatedAt: string;
}

let csrf = "";

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<Answer<T>> {
  if (method === "POST" && !csrf) {
    const s = await realLinkApi.state();
    if (s.ok) csrf = s.data.csrf;
  }
  try {
    const response = await fetch(`/api/link/web/${path}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json", "X-RSLink-CSRF": csrf } : undefined,
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      cache: "no-store",
      credentials: "same-origin",
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: typeof json.error === "string" ? json.error : "error",
        message: typeof json.message === "string" ? json.message : "Something went wrong. Try again in a minute.",
      };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 0, error: "offline", message: "Couldn't reach the server. Check your connection and try again." };
  }
}

export const grantApi = {
  /** Signs in (if needed) and remembers the CSRF token. */
  async state() {
    const s = await realLinkApi.state();
    if (s.ok) csrf = s.data.csrf;
    return s;
  },
  app: (appId: string) => call<GrantApp>("GET", `grant-app?app=${encodeURIComponent(appId)}`),
  grants: () => call<{ grants: GrantRow[] }>("GET", "grants"),
  grant: (appId: string, categories: string[], identity: boolean) => call<GrantRow>("POST", "grant", { appId, categories, identity }),
  revoke: (appId: string) => call<{ grants: GrantRow[] }>("POST", "revoke-grant", { appId }),
  signInHref: (appId: string) => `/api/link/web/auth/discord?next=grant&app=${encodeURIComponent(appId)}`,
};
