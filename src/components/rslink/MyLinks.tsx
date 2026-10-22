"use client";

import { useEffect, useState } from "react";
import type { LinkApi, LinkRow } from "./linkApi";
import { LinkPanel, linkButton, linkGhostButton } from "./LinkShell";
import { XP_CHECK, verifyWords } from "@/lib/rslink/verify";

const STATUS: Record<LinkRow["status"], string> = {
  active: "Linked",
  disputed: "Waiting for a review",
  unlinked: "Unlinked",
  released: "Ended (name passed on)",
  superseded: "Replaced by a newer link",
  removed: "Removed",
};

function day(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

/** Whether the link is confirmed by the "plugin knew it first" check, in plain words. Nothing when the check is off. */
function VerifyLine({ row }: { row: LinkRow }) {
  const words = verifyWords(row.verification, row.verify?.[XP_CHECK]);
  if (!words) return null;
  const colour = words.tone === "good" ? "text-emerald-300" : words.tone === "warn" ? "text-amber-300" : "text-muted";
  return <p className={`mt-1 text-xs ${colour}`}>{words.text}</p>;
}

/** The signed-in Discord account's links (section 9): each character, unlink, and delete everything. */
export function MyLinks({ api, base }: { api: LinkApi; base: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkRow[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const s = await api.state();
      if (!live) return;
      if (!s.ok) return setProblem(s.message);
      setSignedIn(s.data.signedIn);
      setName(s.data.discordName);
      if (!s.data.signedIn) return;
      const l = await api.links();
      if (!live) return;
      if (l.ok) setLinks(l.data.links);
      else setProblem(l.message);
    })();
    return () => {
      live = false;
    };
  }, [api]);

  async function unlink(row: LinkRow) {
    if (!window.confirm(`Unlink ${row.rsn}? The plugin on every PC using this link is signed out.`)) return;
    setBusy(true);
    const answer = await api.unlink(row.linkId);
    setBusy(false);
    if (!answer.ok) return setProblem(answer.message);
    setLinks(answer.data.links);
    setNotice(`${row.rsn} is unlinked.`);
  }

  async function deleteAll() {
    setBusy(true);
    const answer = await api.deleteMyData();
    setBusy(false);
    if (!answer.ok) return setProblem(answer.message);
    setLinks(null);
    setSignedIn(false);
    setNotice("Everything about your Discord account is deleted, and you are signed out.");
  }

  async function signOut() {
    await api.signOut();
    setSignedIn(false);
    setLinks(null);
  }

  if (signedIn === false) {
    return (
      <LinkPanel>
        {notice && <p className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{notice}</p>}
        <h1 className="text-xl font-semibold">My links</h1>
        <p className="mt-2 text-sm text-muted">Sign in with Discord to see, unlink or delete the RuneScape names linked to your account.</p>
        <a className={`${linkButton} mt-5`} href={api.signInHref("links")}>
          Sign in with Discord
        </a>
      </LinkPanel>
    );
  }
  if (!links) {
    return <LinkPanel>{problem ? <p className="text-sm text-red-300">{problem}</p> : <p className="text-sm text-muted">Loading…</p>}</LinkPanel>;
  }

  const current = links.filter((l) => l.status === "active" || l.status === "disputed");
  const ended = links.filter((l) => l.status !== "active" && l.status !== "disputed");

  return (
    <div className="space-y-4">
      <LinkPanel>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold">My links</h1>
          <button type="button" className="text-sm text-muted hover:text-foreground" onClick={() => void signOut()}>
            Sign out @{name}
          </button>
        </div>
        {notice && <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{notice}</p>}
        {problem && (
          <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {problem}
          </p>
        )}
        {current.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No RuneScape names are linked to this Discord account. <a className="text-gold hover:underline" href={base}>Link one</a>.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-surface-border">
            {current.map((l) => (
              <li key={l.linkId} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{l.rsn}</p>
                    <p className="text-xs text-muted">
                      {STATUS[l.status]} · since {day(l.linkedAt)} · last seen {day(l.lastSeenAt)} · {l.devices} PC{l.devices === 1 ? "" : "s"} ·{" "}
                      {l.method === "dm" ? "by DM code" : "by sign-in"} · {l.verification === "implicit" ? "not verified" : l.verification.replace(/_/g, " ")}
                    </p>
                    {l.previousNames.length > 0 && <p className="text-xs text-muted">Previously: {l.previousNames.join(", ")}</p>}
                    <VerifyLine row={l} />
                  </div>
                  <button type="button" className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50" disabled={busy} onClick={() => void unlink(l)}>
                    Unlink
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {ended.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-muted">Ended in the last 30 days ({ended.length})</summary>
            <ul className="mt-2 space-y-1 text-muted">
              {ended.map((l) => (
                <li key={l.linkId}>
                  {l.rsn}: {STATUS[l.status]} {day(l.endedAt)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </LinkPanel>

      <LinkPanel tone="bad">
        <h2 className="text-lg font-semibold">Delete my data</h2>
        <p className="mt-2 text-sm text-muted">
          Deletes every link, your Discord account id, and the history of names for characters only you linked, straight away. If your account is
          blocked for abuse, the block is kept (as a fingerprint, not your id) until it ends.
        </p>
        <label className="mt-4 block text-sm" htmlFor="rslink-delete">
          Type DELETE to confirm
        </label>
        <input id="rslink-delete" className="mt-1 w-full rounded-lg border border-control-border bg-background px-3 py-2" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        <button type="button" className={`${linkGhostButton} mt-3 border-red-500/40 text-red-300`} disabled={busy || confirmText !== "DELETE"} onClick={() => void deleteAll()}>
          Delete everything
        </button>
      </LinkPanel>
    </div>
  );
}
