"use client";

import { useEffect, useState } from "react";
import type { Answer, LinkApi } from "./linkApi";
import { LinkPanel, linkButton, linkInput } from "./LinkShell";

/** Plain words for every way entering a code can go wrong (section 14: clear messages for wrong, expired and locked codes and rate limits). */
export function codeProblem(answer: Extract<Answer<unknown>, { ok: false }>): string {
  switch (answer.error) {
    case "wrong_code":
      return "That code isn't right. Check the code in the plugin and try again.";
    case "expired":
      return "That code has expired. Press Link Discord in the plugin again to get a new one.";
    case "code_in_use":
      return "That code is already being used in another browser. Start again in the plugin.";
    case "rate_limited":
      return `Too many tries. Wait ${answer.retryAfter && answer.retryAfter < 120 ? `${answer.retryAfter} seconds` : "a little while"} and try again.`;
    default:
      return answer.message;
  }
}

const SIGNIN_ERRORS: Record<string, string> = {
  signin_cancelled: "Discord sign-in was cancelled. Enter your code again to retry.",
  signin_expired: "Your sign-in took too long. Enter your code again.",
  signin_failed: "Discord sign-in didn't work. Try again in a minute.",
};

/**
 * Step 1: the code the plugin shows. The name being linked is not shown yet (a guessed code reveals nothing); after a good code the player
 * signs in with Discord, then sees the confirm screen.
 */
export function CodeEntry({ api, initialCode = "", signInError, accepted: acceptedAtStart = false }: { api: LinkApi; initialCode?: string; signInError?: string; accepted?: boolean }) {
  const [code, setCode] = useState(initialCode.toUpperCase().slice(0, 9));
  const [error, setError] = useState<string | null>(signInError ? (SIGNIN_ERRORS[signInError] ?? null) : null);
  const [accepted, setAccepted] = useState(acceptedAtStart);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    void api.state().then((s) => {
      if (!live) return;
      setReady(true);
      if (!s.ok) setError(s.message);
    });
    return () => {
      live = false;
    };
  }, [api]);

  async function submit() {
    setError(null);
    setBusy(true);
    const answer = await api.code(code);
    setBusy(false);
    if (!answer.ok) return setError(codeProblem(answer));
    setAccepted(true);
  }

  if (accepted) {
    return (
      <LinkPanel tone="good">
        <h1 className="text-xl font-semibold">Code accepted</h1>
        <p className="mt-2 text-sm text-muted">Now sign in with Discord. You&apos;ll see which RuneScape name is being linked before anything happens.</p>
        <a className={`${linkButton} mt-5`} href={api.signInHref("confirm")}>
          Sign in with Discord
        </a>
        <p className="mt-3 text-xs text-muted">We only ask Discord for your user id and username. Never your password or email.</p>
      </LinkPanel>
    );
  }

  return (
    <LinkPanel>
      <h1 className="text-xl font-semibold">Enter your code</h1>
      <p className="mt-2 text-sm text-muted">Open the RS Link plugin in RuneScape and press Link Discord. Type the 8-character code it shows.</p>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && code.replace(/[\s-]/g, "").length === 8) void submit();
        }}
      >
        <label className="sr-only" htmlFor="rslink-code">
          Code from the plugin
        </label>
        <input
          id="rslink-code"
          className={linkInput}
          value={code}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          maxLength={9}
          placeholder="XXXX-XXXX"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        {error && (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <button type="submit" className={linkButton} disabled={!ready || busy || code.replace(/[\s-]/g, "").length !== 8}>
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
      <p className="mt-5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
        Only enter a code from your own game screen. Never enter a code someone sent you: it would link their character to your Discord.
      </p>
    </LinkPanel>
  );
}
