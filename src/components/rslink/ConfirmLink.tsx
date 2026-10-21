"use client";

import { useEffect, useState } from "react";
import type { LinkApi, PairingView } from "./linkApi";
import { LinkPanel, linkButton, linkGhostButton } from "./LinkShell";

type Result = "linked" | "disputed" | "denied";

/**
 * Step 2, after Discord sign-in: "Link RuneScape name X to Discord @someone?", with the warning from section 4.1 and the two buttons. The
 * name is large and shown before anything is linked, so nobody links a name they didn't mean to.
 */
export function ConfirmLink({ api, base, result: resultAtStart = null }: { api: LinkApi; base: string; result?: Result | null }) {
  const [name, setName] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [pairing, setPairing] = useState<PairingView | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [result, setResult] = useState<Result | null>(resultAtStart);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const s = await api.state();
      if (!live) return;
      if (!s.ok) return setProblem(s.message);
      setSignedIn(s.data.signedIn);
      setName(s.data.discordName);
      if (!s.data.signedIn) return;
      const p = await api.pairing();
      if (!live) return;
      if (p.ok) setPairing(p.data);
      else if (p.status === 410) setExpired(true);
      else setProblem(p.message);
    })();
    return () => {
      live = false;
    };
  }, [api]);

  async function decide(decision: "link" | "deny") {
    setBusy(true);
    setProblem(null);
    const answer = await api.confirm(decision);
    setBusy(false);
    if (answer.ok) return setResult(answer.data.result);
    if (answer.status === 410) return setExpired(true);
    setProblem(answer.message);
  }

  if (result === "linked") {
    return (
      <LinkPanel tone="good">
        <h1 className="text-xl font-semibold">Linked</h1>
        <p className="mt-2 text-sm text-muted">Go back to RuneScape: the plugin finishes on its own within a few seconds. You can close this page.</p>
        <a className={`${linkGhostButton} mt-5`} href={`${base === "/" ? "" : base}/links`}>
          See my links
        </a>
      </LinkPanel>
    );
  }
  if (result === "disputed") {
    return (
      <LinkPanel tone="warn">
        <h1 className="text-xl font-semibold">Waiting for a review</h1>
        <p className="mt-2 text-sm text-muted">
          Another character claimed this name recently. Your link is saved, but plugins can&apos;t use it until the claim is settled. Nothing else to do
          for now; keep playing with the plugin on and it will catch up.
        </p>
      </LinkPanel>
    );
  }
  if (result === "denied") {
    return (
      <LinkPanel>
        <h1 className="text-xl font-semibold">Cancelled</h1>
        <p className="mt-2 text-sm text-muted">Nothing was linked. If someone sent you this code, ignore them: we never ask you to enter a code from someone else.</p>
      </LinkPanel>
    );
  }
  if (expired) {
    return (
      <LinkPanel tone="bad">
        <h1 className="text-xl font-semibold">That code has expired</h1>
        <p className="mt-2 text-sm text-muted">Codes last 10 minutes. Press Link Discord in the plugin again and enter the new code.</p>
        <a className={`${linkButton} mt-5`} href={base}>
          Enter a new code
        </a>
      </LinkPanel>
    );
  }
  if (signedIn === false) {
    return (
      <LinkPanel>
        <h1 className="text-xl font-semibold">Sign in with Discord</h1>
        <p className="mt-2 text-sm text-muted">Sign in to see which RuneScape name is waiting to be linked.</p>
        <a className={`${linkButton} mt-5`} href={api.signInHref("confirm")}>
          Sign in with Discord
        </a>
      </LinkPanel>
    );
  }
  if (!pairing) {
    return <LinkPanel>{problem ? <p className="text-sm text-red-300">{problem}</p> : <p className="text-sm text-muted">Loading…</p>}</LinkPanel>;
  }

  return (
    <LinkPanel>
      <p className="text-sm text-muted">Link RuneScape name</p>
      <p className="mt-1 break-words text-3xl font-bold text-gold">{pairing.rsn}</p>
      <p className="mt-3 text-sm text-muted">to Discord</p>
      <p className="mt-1 text-xl font-semibold">@{name ?? "you"}</p>
      <p className="mt-5 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
        Only continue if you are logged in to RuneScape as <strong>{pairing.rsn}</strong> right now and this code is on your own screen. Never enter a code
        someone sent you.
      </p>
      {problem && (
        <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {problem}
        </p>
      )}
      <div className="mt-5 grid gap-3">
        <button type="button" className={linkButton} disabled={busy} onClick={() => void decide("link")}>
          Link
        </button>
        <button type="button" className={linkGhostButton} disabled={busy} onClick={() => void decide("deny")}>
          This isn&apos;t me
        </button>
      </div>
      <p className="mt-4 text-xs text-muted">Expires in {Math.max(1, Math.ceil(pairing.expiresIn / 60))} minutes.</p>
    </LinkPanel>
  );
}
