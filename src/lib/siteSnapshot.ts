import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

/**
 * The website's half of a dev snapshot, and the merge of both halves into the one zip a bug report carries. The bot's zip layout is the
 * contract in JonnyBot/docs/DEV-SNAPSHOT.md; this adds a `site/` folder beside it and touches nothing else but the manifest's file list.
 */

export const SNAPSHOT_ID = /^snap-\d{8}-\d{6}-[0-9a-f]{4}$/;
export const FOCUS = /^(event|ticket|member):\d{1,20}$/;

/** One captured console error, failed request or script error. Text is capped and never holds headers, bodies or cookies. */
export interface RingEntry {
  at: string;
  kind: "console" | "fetch" | "error";
  message: string;
}

/** What the browser reports, after {@link cleanClientState}. */
export interface ClientState {
  url: string;
  path: string;
  guildId: string | null;
  focus: string;
  browserTime: string;
  timezone: string;
  viewport: { width: number; height: number; dpr: number };
  ring: RingEntry[];
  storage: Record<string, string>;
}

export interface ServerState {
  face: "hub" | "jonnybot" | "clan";
  role: string;
  siteCommit: string;
  nodeEnv: string;
  serverTimeUtc: string;
}

const SECRETISH = /token|secret|password|passwd|session|cookie|auth|key|jwt|credential/i;
const MAX_TEXT = 500;

/** Masks anything that looks like a credential, so a console line that printed one does not end up in the zip. */
export function scrub(text: string): string {
  return text
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, "$1 [REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, "[REDACTED]")
    .replace(/\b[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{27,}\b/g, "[REDACTED]")
    .replace(/([A-Za-z0-9_-]*(?:token|secret|password|passwd|key|session|code|state|cookie)[A-Za-z0-9_-]*)"?\s*[=:]\s*("[^"]*"|'[^']*'|[^\s&;,"']+)/gi, "$1=[REDACTED]")
    .slice(0, MAX_TEXT);
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? scrub(value.slice(0, max)) : "";
}

/** The URL without its query string or fragment: those can carry codes and tokens. */
function bareUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return "";
  }
}

/** Validates the browser's report down to plain, bounded, scrubbed fields. Anything unexpected is dropped, never passed through. */
export function cleanClientState(raw: unknown): ClientState {
  const o = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const ring = Array.isArray(o.ring) ? o.ring.slice(-50) : [];
  const storageIn = typeof o.storage === "object" && o.storage !== null ? (o.storage as Record<string, unknown>) : {};
  const storage: Record<string, string> = {};
  for (const [key, value] of Object.entries(storageIn).slice(0, 40)) {
    if (SECRETISH.test(key) || typeof value !== "string") continue;
    storage[key.slice(0, 80)] = scrub(value.slice(0, 200));
  }
  const viewport = (typeof o.viewport === "object" && o.viewport !== null ? o.viewport : {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
  const focus = typeof o.focus === "string" ? o.focus.trim().toLowerCase() : "";
  return {
    url: bareUrl(o.url),
    path: str(o.path, 300).split(/[?#]/)[0],
    guildId: typeof o.guildId === "string" && /^\d{1,20}$/.test(o.guildId) ? o.guildId : null,
    focus: FOCUS.test(focus) ? focus : "",
    browserTime: str(o.browserTime, 40),
    timezone: str(o.timezone, 60),
    viewport: { width: num(viewport.width), height: num(viewport.height), dpr: num(viewport.dpr) },
    ring: ring.flatMap((e): RingEntry[] => {
      if (typeof e !== "object" || e === null) return [];
      const r = e as Record<string, unknown>;
      const kind = r.kind === "fetch" || r.kind === "error" ? r.kind : "console";
      return [{ at: str(r.at, 40), kind, message: str(r.message, MAX_TEXT) }];
    }),
    storage,
  };
}

/**
 * The bot's zip plus a `site/` folder: `site/page.json` (url, route, face, role, times, viewport, guild), `site/client-log.json` (the ring buffer)
 * and `site/storage.json` (the site's own localStorage keys). The bot's `manifest.json` only gains a `siteFiles` list.
 */
export function mergeSnapshot(botZip: Uint8Array, id: string, client: ClientState, server: ServerState): Uint8Array {
  const entries = unzipSync(botZip);
  const json = (value: unknown) => strToU8(JSON.stringify(value, null, 2) + "\n");

  entries["site/page.json"] = json({
    snapshotId: id,
    url: client.url,
    route: client.path,
    face: server.face,
    role: server.role,
    guildInContext: client.guildId,
    focus: client.focus,
    browserTime: client.browserTime,
    browserTimezone: client.timezone,
    serverTimeUtc: server.serverTimeUtc,
    viewport: client.viewport,
    siteCommit: server.siteCommit || null,
    nodeEnv: server.nodeEnv,
  });
  entries["site/client-log.json"] = json({ note: "last 50 console errors, script errors and failed fetches since the page was opened", entries: client.ring });
  entries["site/storage.json"] = json(client.storage);

  const manifestRaw = entries["manifest.json"];
  if (manifestRaw) {
    try {
      const manifest = JSON.parse(strFromU8(manifestRaw)) as Record<string, unknown>;
      manifest.siteFiles = ["site/page.json", "site/client-log.json", "site/storage.json"];
      entries["manifest.json"] = json(manifest);
    } catch {
      // a manifest we can't read is left as the bot wrote it
    }
  }
  return zipSync(entries, { level: 6 });
}
