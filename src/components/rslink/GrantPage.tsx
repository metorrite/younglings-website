"use client";

import { useEffect, useState } from "react";
import { grantApi, type GrantApp, type GrantRow } from "./grantApi";
import { LinkPanel, linkButton, linkGhostButton } from "./LinkShell";

/**
 * A bot asks to see some of the player's plugin data (T-163, HUB-DESIGN.md 5.7). The player signs in with Discord, sees who is asking,
 * ticks what the bot may see and decides separately whether it may see their Discord account. Nothing is shared until they press Allow;
 * they can take it back on My links at any time.
 */
export function GrantPage({ appId, base, signInError }: { appId: string; base: string; signInError?: string }) {
  const [app, setApp] = useState<GrantApp | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [identity, setIdentity] = useState(false);
  const [problem, setProblem] = useState<string | null>(signInError ? "Signing in didn't finish. Try again." : null);
  const [done, setDone] = useState<GrantRow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const s = await grantApi.state();
      if (!live) return;
      if (!s.ok) return setProblem(s.message);
      setSignedIn(s.data.signedIn);
      const a = await grantApi.app(appId);
      if (!live) return;
      if (!a.ok) return setProblem(a.status === 404 ? "This bot isn't one this service knows, or it has been switched off." : a.message);
      setApp(a.data);
      if (!s.data.signedIn) return;
      const g = await grantApi.grants();
      if (!live || !g.ok) return;
      const existing = g.data.grants.find((x) => x.appId === appId);
      if (existing) {
        setChosen(existing.categories);
        setIdentity(existing.identity);
      }
    })();
    return () => {
      live = false;
    };
  }, [appId]);

  async function allow() {
    setBusy(true);
    setProblem(null);
    const answer = await grantApi.grant(appId, chosen, identity);
    setBusy(false);
    if (!answer.ok) return setProblem(answer.message);
    setDone(answer.data);
  }

  if (problem && !app) return <LinkPanel tone="bad"><p className="text-sm">{problem}</p></LinkPanel>;
  if (!app || signedIn === null) return <LinkPanel><p className="text-sm text-muted">Loading…</p></LinkPanel>;

  if (done) {
    return (
      <LinkPanel tone="good">
        <h1 className="text-lg font-semibold">{app.name} can now see what you chose.</h1>
        <p className="mt-2 text-sm text-muted">You can change or take this back at any time on My links.</p>
        <a className={`${linkGhostButton} mt-4`} href={`${base === "/" ? "" : base}/links`}>
          My links
        </a>
      </LinkPanel>
    );
  }

  return (
    <div className="space-y-4">
      <LinkPanel>
        <h1 className="text-lg font-semibold">{app.name} would like to see some of your plugin data</h1>
        {app.description && <p className="mt-2 text-sm text-muted">{app.description}</p>}
        <p className="mt-3 text-xs text-muted">
          This is a Discord bot run by someone else. It sees only what you tick below, from the RuneScape characters you linked with RS Link,
          and only while you let the plugin collect it. Take it back at any time.
        </p>
      </LinkPanel>

      {!signedIn ? (
        <LinkPanel>
          <p className="text-sm">Sign in with Discord so we know whose data this is.</p>
          <a className={`${linkButton} mt-4`} href={grantApi.signInHref(appId)}>
            Sign in with Discord
          </a>
        </LinkPanel>
      ) : (
        <LinkPanel>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">What {app.name} may see</legend>
            {app.categories.map((c) => (
              <label key={c.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-surface-border/60 bg-background/40 px-4 py-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-[var(--color-gold)]"
                  checked={chosen.includes(c.key)}
                  onChange={(e) => setChosen(e.target.checked ? [...new Set([...chosen, c.key])] : chosen.filter((k) => k !== c.key))}
                />
                <span>
                  <span className="block text-sm font-medium">{c.label}</span>
                  <span className="block text-xs text-muted">{c.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-500/40 bg-background/40 px-4 py-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-gold)]" checked={identity} onChange={(e) => setIdentity(e.target.checked)} />
            <span>
              <span className="block text-sm font-medium">Also let it know which Discord account is mine</span>
              <span className="block text-xs text-muted">
                Off: the bot sees you under a nickname only it gets, and can&apos;t tell who you are on Discord. On: it can match your RuneScape data to
                your Discord account (for example to give you a role).
              </span>
            </span>
          </label>
          {problem && (
            <p role="alert" className="mt-4 text-sm text-red-300">
              {problem}
            </p>
          )}
          <button type="button" className={`${linkButton} mt-4`} disabled={busy || (chosen.length === 0 && !identity)} onClick={allow}>
            Allow
          </button>
          <a className={`${linkGhostButton} mt-2`} href={`${base === "/" ? "" : base}/links`}>
            Not now
          </a>
        </LinkPanel>
      )}
    </div>
  );
}

/** "Bots you've allowed" on My links: each bot, what it sees, and Remove. Shown only when the hub is in use. */
export function MyGrants() {
  const [rows, setRows] = useState<GrantRow[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const s = await grantApi.state();
      if (!live || !s.ok || !s.data.signedIn) return;
      const g = await grantApi.grants();
      if (!live) return;
      if (g.ok) setRows(g.data.grants);
      else setProblem(g.message);
    })();
    return () => {
      live = false;
    };
  }, []);

  async function remove(row: GrantRow) {
    if (!window.confirm(`Stop ${row.appName} seeing your plugin data?`)) return;
    setBusy(true);
    const answer = await grantApi.revoke(row.appId);
    setBusy(false);
    if (!answer.ok) return setProblem(answer.message);
    setRows(answer.data.grants);
  }

  if (rows === null && !problem) return null;
  return (
    <LinkPanel>
      <h2 className="font-semibold">Bots you&apos;ve allowed</h2>
      {problem && <p className="mt-2 text-sm text-red-300">{problem}</p>}
      {rows && rows.length === 0 && <p className="mt-2 text-sm text-muted">None. A bot can ask you on its own page; nothing is shared until you allow it.</p>}
      {rows && rows.length > 0 && (
        <ul className="mt-3 divide-y divide-surface-border/60">
          {rows.map((r) => (
            <li key={r.appId} className="flex items-start justify-between gap-3 py-3 text-sm">
              <span>
                <span className="block font-medium">{r.appName}</span>
                <span className="block text-xs text-muted">
                  Sees: {r.categories.length ? r.categories.join(", ").toLowerCase() : "nothing from the plugin"}
                  {r.identity ? " · knows your Discord account" : ""}
                </span>
              </span>
              <button type="button" className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-40" disabled={busy} onClick={() => remove(r)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </LinkPanel>
  );
}
