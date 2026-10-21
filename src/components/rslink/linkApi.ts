/**
 * What the RS Link pages ask of the site, as one object, so the preview harness can hand them made-up answers. The real one calls
 * `/api/link/web/*` (the same path on every host) with the session's CSRF token.
 */

export type Answer<T> = { ok: true; data: T } | { ok: false; status: number; error: string; message: string; retryAfter?: number };

export interface LinkState {
  signedIn: boolean;
  discordName: string | null;
  csrf: string;
}

export interface PairingView {
  rsn: string;
  expiresIn: number;
  tracked: boolean;
}

export interface LinkRow {
  linkId: string;
  rsn: string;
  status: "active" | "disputed" | "unlinked" | "released" | "superseded" | "removed";
  method: "oauth" | "dm";
  verification: string;
  linkedAt: string;
  lastSeenAt: string;
  endedAt: string | null;
  tracked: boolean;
  devices: number;
  previousNames: string[];
}

export interface LinkApi {
  state(): Promise<Answer<LinkState>>;
  code(code: string): Promise<Answer<{ accepted: boolean; expiresIn: number }>>;
  pairing(): Promise<Answer<PairingView>>;
  confirm(decision: "link" | "deny"): Promise<Answer<{ result: "linked" | "disputed" | "denied"; rsn?: string }>>;
  links(): Promise<Answer<{ links: LinkRow[] }>>;
  unlink(linkId: string): Promise<Answer<{ links: LinkRow[] }>>;
  deleteMyData(): Promise<Answer<{ deleted: boolean }>>;
  signOut(): Promise<Answer<{ signedOut: boolean }>>;
  /** Where the browser goes to sign in with Discord. */
  signInHref(next: "confirm" | "links"): string;
}

let csrf = "";

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<Answer<T>> {
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
        retryAfter: typeof json.retryAfter === "number" ? json.retryAfter : undefined,
      };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 0, error: "offline", message: "Couldn't reach the server. Check your connection and try again." };
  }
}

export const realLinkApi: LinkApi = {
  async state() {
    const answer = await call<LinkState>("GET", "state");
    if (answer.ok) csrf = answer.data.csrf;
    return answer;
  },
  code: (code) => call("POST", "code", { code }),
  pairing: () => call("GET", "pairing"),
  confirm: (decision) => call("POST", "confirm", { decision }),
  links: () => call("GET", "links"),
  unlink: (linkId) => call("POST", "unlink", { linkId }),
  deleteMyData: () => call("POST", "delete-my-data", { confirm: "DELETE" }),
  signOut: () => call("POST", "signout"),
  signInHref: (next) => `/api/link/web/auth/discord?next=${next}`,
};
