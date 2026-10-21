import { randomBytes } from "node:crypto";

/**
 * One-time handoff codes for signing in on the other apex (docs/DOMAINS-AND-SITE-BUILDER.md A3). The auth host, where the Discord
 * sign-in finished, issues a code for one target host; that host's `/auth/handoff` swaps it, server side, for who signed in and sets its
 * own session cookie. A code is random (32 bytes), lives 60 seconds, works once and only on the host it was made for. Codes are never
 * logged.
 *
 * The codes live in this process's memory: the site runs as one instance (Railway). Running several would need the store moved to
 * somewhere shared (the bot), or a code issued by one instance would not be found by another (the visitor just signs in again).
 */

export interface HandoffIdentity {
  sub?: string;
  discordId?: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
}

interface Entry {
  identity: HandoffIdentity;
  host: string;
  expiresAt: number;
}

export const HANDOFF_TTL_MS = 60_000;
const MAX_CODES = 5_000;

export class HandoffStore {
  private readonly codes = new Map<string, Entry>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  /** A new code for `host` (bare, lowercase, port kept), carrying who signed in. */
  issue(identity: HandoffIdentity, host: string): string {
    this.sweep();
    if (this.codes.size >= MAX_CODES) this.codes.delete(this.codes.keys().next().value as string);
    const code = randomBytes(32).toString("base64url");
    this.codes.set(code, { identity: { ...identity }, host: host.toLowerCase(), expiresAt: this.now() + HANDOFF_TTL_MS });
    return code;
  }

  /** Who the code is for, once: a used, expired, unknown or wrong-host code gives null (and a wrong-host try burns the code). */
  redeem(code: string, host: string): HandoffIdentity | null {
    if (typeof code !== "string" || code.length < 20 || code.length > 100) return null;
    const entry = this.codes.get(code);
    if (!entry) return null;
    this.codes.delete(code);
    if (entry.expiresAt <= this.now() || entry.host !== host.toLowerCase()) return null;
    return entry.identity;
  }

  private sweep() {
    const now = this.now();
    for (const [code, entry] of this.codes) if (entry.expiresAt <= now) this.codes.delete(code);
  }
}

const globalStore = globalThis as unknown as { __handoffStore?: HandoffStore };
/** The process's store (kept on globalThis so a dev-server reload doesn't empty it mid-sign-in). */
export const handoffStore: HandoffStore = (globalStore.__handoffStore ??= new HandoffStore());
