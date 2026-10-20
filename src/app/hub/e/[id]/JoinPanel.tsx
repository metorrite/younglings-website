"use client";

import { useState, useTransition } from "react";
import type { HubJoinResult } from "@/lib/hubEvents";
import { joinHubEventAction } from "./actions";

/**
 * Joining an event from the events hub. Signed out: a sign-in link. Signed in: Join; someone who isn't in the host's Discord yet is shown the invite and a
 * "try again" once they have joined it (players must be in the host's server, D10).
 */
export function JoinPanel({ eventId, signedIn, signInHref, open, hostName, needsRsn }: { eventId: string; signedIn: boolean; signInHref: string; open: boolean; hostName: string; needsRsn: boolean }) {
  const [result, setResult] = useState<HubJoinResult | null>(null);
  const [pending, start] = useTransition();

  if (!open) return <p className="text-sm text-muted">Signups aren&apos;t open for this event.</p>;
  if (!signedIn) {
    return (
      <a href={signInHref} className="inline-block rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black hover:brightness-110">
        Sign in with Discord to join
      </a>
    );
  }
  const join = () => start(async () => setResult(await joinHubEventAction(eventId)));

  if (result?.ok) {
    return (
      <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200" role="status">
        {result.waiting ? `You're on the waitlist (number ${result.position}). You'll get a place if someone leaves.` : "You're in! Your event page, team and channels are in the host's Discord."}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {needsRsn && <p className="text-xs text-muted">This event reads your game progress, so link your RuneScape name on your profile first.</p>}
      <button type="button" disabled={pending} onClick={join} className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-60">
        {pending ? "Joining…" : result && !result.ok && result.notInServer ? "I've joined, try again" : "Join"}
      </button>
      {result && !result.ok && (
        <div className="space-y-2 rounded-xl border border-gold/40 p-3 text-sm" role="alert">
          <p>{result.error}</p>
          {result.notInServer &&
            (result.inviteUrl ? (
              <a href={result.inviteUrl} target="_blank" rel="noreferrer noopener" className="inline-block font-semibold text-gold underline">
                Join the {hostName} Discord
              </a>
            ) : (
              <p className="text-muted">Ask the organisers of {hostName} for an invite.</p>
            ))}
        </div>
      )}
    </div>
  );
}
