"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelLinkAction, submitLinkAction } from "@/app/link/actions";
import type { LinkState } from "@/lib/site";

/**
 * The "link your RuneScape name" form, and — once a request is in — its status. Shared by the pop-up on the home
 * page and the profile overview so both say the same thing. A request is reviewed by an admin, exactly like `/rs` in Discord.
 */
export function LinkRsn({ state, pendingRsn, onSubmitted, autoFocus = false }: { state: LinkState["state"]; pendingRsn: string | null; onSubmitted?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const [rsn, setRsn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (state === "LINKED") {
    return <p className="text-sm text-emerald-400">✓ Your RuneScape name is linked.</p>;
  }

  if (state === "PENDING") {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4">
          <span aria-hidden className="text-xl">⏳</span>
          <div className="text-sm">
            <p className="font-semibold text-yellow-300">In review{pendingRsn ? `: ${pendingRsn}` : ""}</p>
            <p className="mt-1 text-muted">An admin is looking at your request. You&apos;ll get a Discord message when it&apos;s approved or turned down, and this page updates once it is.</p>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await cancelLinkAction();
              if (!result.ok) setError(result.error);
              else router.refresh();
            });
          }}
          className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
        >
          Typed the wrong name? Cancel this request
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await submitLinkAction(rsn);
          if (!result.ok) return setError(result.error);
          onSubmitted?.();
          router.refresh();
        });
      }}
    >
      <label className="block text-sm font-medium" htmlFor="link-rsn">
        RuneScape name
      </label>
      <div className="flex gap-2">
        <input
          id="link-rsn"
          value={rsn}
          onChange={(e) => setRsn(e.target.value)}
          maxLength={12}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="Your exact in-game display name"
          className="min-w-0 flex-1 rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
        />
        <button type="submit" disabled={pending || rsn.trim() === ""} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-40">
          {pending ? "Sending…" : "Request link"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
