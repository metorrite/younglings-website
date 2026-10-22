import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * The RS Link page's own session (LINK-SYSTEM.md sections 5.2 and 7): one cookie, sealed with AES-256-GCM under `LINK_COOKIE_KEY`, holding
 * an opaque browser session id (the bot binds the pairing to its hash), a CSRF token, and after sign-in the Discord id and username. It
 * shares nothing with the clan site's sign-in: different cookie, different key, no NextAuth. 15 minutes idle, 1 hour at most. Pure (no
 * framework imports) so it can be tested on its own; the route helpers set and read the cookie.
 */

export interface LinkSession {
  /** Opaque browser session id, sent to the bot (which stores only its hash). */
  sid: string;
  csrf: string;
  /** Issued at and last seen, epoch ms. */
  iat: number;
  seen: number;
  /** The signed-in Discord account, from the verified OAuth callback. */
  did?: string;
  dname?: string;
  /** An OAuth sign-in in progress: state, PKCE verifier, when it started and where to go after (for the grant page, which app). */
  oauth?: { state: string; verifier: string; at: number; next: "confirm" | "links" | "grant"; app?: string };
}

export const IDLE_MS = 15 * 60_000;
export const MAX_MS = 60 * 60_000;
export const OAUTH_MS = 10 * 60_000;

/** `__Host-` needs Secure, which plain-http localhost can't always set, so local development uses a plain name. */
export function cookieName(secure: boolean): string {
  return secure ? "__Host-rslink" : "rslink";
}

/** The sealing key from `LINK_COOKIE_KEY`, or null when it is missing or shorter than 32 bytes. */
export function cookieKey(raw = process.env.LINK_COOKIE_KEY): Buffer | null {
  if (!raw) return null;
  let bytes: Buffer;
  try {
    bytes = Buffer.from(raw.trim().replace(/-/g, "+").replace(/_/g, "/"), "base64");
  } catch {
    return null;
  }
  if (bytes.length < 32) return null;
  return createHash("sha256").update("rslink|cookie|v1|").update(bytes).digest();
}

const b64u = (b: Buffer) => b.toString("base64url");

export function randomToken(bytes = 32): string {
  return b64u(randomBytes(bytes));
}

export function newSession(now = Date.now()): LinkSession {
  return { sid: randomToken(32), csrf: randomToken(24), iat: now, seen: now };
}

export function seal(session: LinkSession, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  return b64u(Buffer.concat([iv, cipher.getAuthTag(), body]));
}

/** The session in a cookie value, or null when it is forged, from another key, or too old (idle or overall). */
export function open(value: string | undefined, key: Buffer, now = Date.now()): LinkSession | null {
  if (!value || value.length > 4096) return null;
  try {
    const raw = Buffer.from(value, "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    const s = JSON.parse(json) as LinkSession;
    if (typeof s.sid !== "string" || typeof s.csrf !== "string" || typeof s.iat !== "number" || typeof s.seen !== "number") return null;
    if (now - s.seen > IDLE_MS || now - s.iat > MAX_MS) return null;
    if (s.oauth && now - s.oauth.at > OAUTH_MS) delete s.oauth;
    return s;
  } catch {
    return null;
  }
}

/** PKCE S256 challenge for a verifier. */
export function pkceChallenge(verifier: string): string {
  return b64u(createHash("sha256").update(verifier).digest());
}

/** Compares two strings in constant time for equal lengths. */
export function sameSecret(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
