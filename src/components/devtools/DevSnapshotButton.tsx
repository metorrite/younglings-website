"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { installRingBuffer, ringSnapshot } from "@/components/devtools/ringBuffer";
import type { ClientState } from "@/lib/siteSnapshot";

/** What taking a snapshot gives back: the id, the zip and the name to save it under. */
export interface TakenSnapshot {
  id: string;
  filename: string;
  blob: Blob;
}

/** The real call: the owner-only route, which asks the bot and merges both halves. The preview harness passes a stand-in instead. */
async function sendToRoute(state: Omit<ClientState, "storage"> & { storage: Record<string, string> }): Promise<TakenSnapshot> {
  const response = await fetch("/api/dev/snapshot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state), cache: "no-store" });
  if (!response.ok) {
    const detail = await response.json().then((j: { error?: string }) => j.error).catch(() => undefined);
    throw new Error(detail ?? `The snapshot failed (${response.status}).`);
  }
  const id = response.headers.get("X-Snapshot-Id") ?? "snapshot";
  return { id, filename: `jb-snapshot-${id}.zip`, blob: await response.blob() };
}

/** The site's own localStorage keys and values, minus anything credential-shaped (the server filters again). */
function readStorage(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < window.localStorage.length && i < 40; i++) {
      const key = window.localStorage.key(i);
      if (!key || /token|secret|password|session|cookie|auth|key|jwt|credential/i.test(key)) continue;
      out[key] = (window.localStorage.getItem(key) ?? "").slice(0, 200);
    }
  } catch {
    // storage blocked: the snapshot just has none
  }
  return out;
}

function download(taken: TakenSnapshot) {
  const url = URL.createObjectURL(taken.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = taken.filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * The owner's dev snapshot button, a small tab at the bottom-left of every page. Rendered only for the bot's owner (the layout checks on the server, so for
 * anyone else this component and its script are never sent). It reports the page's state, the route asks the bot for its half, and one zip downloads.
 * The ring buffer of console errors and failed requests starts when this mounts.
 */
export function DevSnapshotButton({ face, role, send = sendToRoute }: { face: string; role: string; send?: typeof sendToRoute }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => installRingBuffer(), []);

  const guildId = /^\/dashboard\/(\d{1,20})(?:\/|$)/.exec(pathname)?.[1] ?? null;
  const focusText = focus.trim().toLowerCase();
  const focusOk = focusText === "" || /^(event|ticket|member):\d{1,20}$/.test(focusText);

  async function take() {
    setBusy(true);
    setError(null);
    try {
      const result = await send({
        url: window.location.href,
        path: pathname,
        guildId,
        focus: focusText,
        browserTime: new Date().toString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
        ring: ringSnapshot(),
        storage: readStorage(),
      });
      download(result);
      setTaken({ id: result.id, url: window.location.href.split(/[?#]/)[0] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The snapshot failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(what: "id" | "report") {
    if (!taken) return;
    const text = what === "id" ? taken.id : `Dev snapshot id: ${taken.id}\nPage: ${taken.url}\nFace: ${face}\nTaken: ${new Date().toISOString()}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Couldn't copy; select the id by hand.");
    }
  }

  return (
    <div data-dev-snapshot className="fixed bottom-3 left-3 z-50 text-sm">
      {open ? (
        <div className="w-72 space-y-2 rounded-lg border border-surface-border bg-surface p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Dev snapshot</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close dev snapshot" className="text-muted hover:text-foreground">×</button>
          </div>
          <p className="text-xs text-muted">Saves this page&apos;s state and the bot&apos;s into one zip. Role: {role}. No cookies or tokens.</p>
          <label className="block text-xs text-muted">
            Focus (optional)
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="event:12, ticket:34 or member:<id>"
              className="mt-1 w-full rounded-md border border-control-border bg-background px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          {!focusOk && <p className="text-xs text-red-300">Use event:12, ticket:34 or member:&lt;Discord id&gt;.</p>}
          <button type="button" disabled={busy || !focusOk} onClick={take} className="w-full rounded-md bg-gold px-3 py-2 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-50">
            {busy ? "Taking snapshot…" : "Take snapshot"}
          </button>
          {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          {taken && (
            <div className="space-y-1.5 border-t border-surface-border pt-2">
              <p className="break-all font-mono text-xs">{taken.id}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => copy("id")} className="rounded-md border border-surface-border px-2.5 py-1 text-xs text-muted hover:text-foreground">{copied === "id" ? "Copied" : "Copy id"}</button>
                <button type="button" onClick={() => copy("report")} className="rounded-md border border-surface-border px-2.5 py-1 text-xs text-muted hover:text-foreground">{copied === "report" ? "Copied" : "Copy bug report"}</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-surface-border bg-surface px-3 py-1.5 text-xs text-muted shadow transition hover:text-foreground">
          Snapshot
        </button>
      )}
    </div>
  );
}
