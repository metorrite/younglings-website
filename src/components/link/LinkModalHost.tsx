"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { LinkState } from "@/lib/site";
import { LinkRsn } from "./LinkRsn";

/** Fired by anything that wants the link dialog open (the profile menu's "Link your RuneScape name"). */
export const OPEN_LINK_EVENT = "younglings:link-rsn";
const CHANGED = "younglings:link-prompt-changed";

const foreverKey = (userId: string) => `younglings.linkprompt.never.${userId}`;
const sessionKey = (userId: string) => `younglings.linkprompt.dismissed.${userId}`;

function readDismissal(userId: string): "never" | "session" | null {
  try {
    if (window.localStorage.getItem(foreverKey(userId)) === "1") return "never";
    if (window.sessionStorage.getItem(sessionKey(userId)) === "1") return "session";
  } catch {
    // storage blocked: the prompt then simply shows once per page load
  }
  return null;
}

/**
 * The dialog for linking a RuneScape name. It opens by itself on the home page for someone signed in who hasn't
 * linked a name (unless they said not to ask again, or closed it this session) and can be opened from anywhere
 * else. It is an in-page dialog, not a browser window: Escape, the backdrop and "Not now" all close it.
 */
export function LinkModalHost({ userId, state, pendingRsn }: { userId: string; state: LinkState["state"]; pendingRsn: string | null }) {
  const pathname = usePathname();
  const [forced, setForced] = useState(false);
  const [dontAsk, setDontAsk] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);

  // "Dismissed" lives in browser storage; the server render assumes dismissed so nothing flashes or mismatches.
  const dismissal = useSyncExternalStore(
    (notify) => {
      window.addEventListener(CHANGED, notify);
      window.addEventListener("storage", notify);
      return () => {
        window.removeEventListener(CHANGED, notify);
        window.removeEventListener("storage", notify);
      };
    },
    () => readDismissal(userId),
    () => "never" as const,
  );

  const auto = pathname === "/" && state === "NONE" && dismissal === null;
  const open = forced || auto;

  const close = useCallback(() => {
    setForced(false);
    try {
      if (dontAsk) window.localStorage.setItem(foreverKey(userId), "1");
      else window.sessionStorage.setItem(sessionKey(userId), "1");
    } catch {
      // nothing to remember it with; it will ask again next time
    }
    window.dispatchEvent(new Event(CHANGED));
  }, [dontAsk, userId]);

  useEffect(() => {
    const show = () => setForced(true);
    window.addEventListener(OPEN_LINK_EVENT, show);
    return () => window.removeEventListener(OPEN_LINK_EVENT, show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !dialog.current) return;
      // Keep Tab inside the dialog while it is open.
      const focusable = dialog.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
      <div className="hub-in absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} aria-hidden />
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="link-title" className="nav-pop relative w-full max-w-md rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl">
        <button type="button" onClick={close} aria-label="Close" className="absolute top-3 right-3 rounded-md px-2 py-1 text-muted transition hover:bg-white/10 hover:text-foreground">
          ✕
        </button>

        <div className="mb-4 flex items-center gap-3">
          <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-xl">🔗</span>
          <div>
            <h2 id="link-title" className="text-lg font-semibold">
              {state === "PENDING" ? "Your link request" : "Link your RuneScape name"}
            </h2>
            <p className="text-xs text-muted">Younglings clan hub</p>
          </div>
        </div>

        {state === "NONE" && (
          <p className="mb-4 text-sm text-muted">
            Connect your in-game name to unlock your profile: goals, your activity, recaps and your own member page. Everything else on the site works without it. An admin reviews each request.
          </p>
        )}

        <LinkRsn state={state} pendingRsn={pendingRsn} autoFocus onSubmitted={() => setForced(true)} />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-surface-border pt-4">
          {state === "NONE" ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} className="accent-[var(--color-gold)]" />
              Don&apos;t show this again
            </label>
          ) : (
            <span />
          )}
          <button type="button" onClick={close} className="rounded-md border border-surface-border px-4 py-1.5 text-sm transition hover:border-gold/50">
            {state === "NONE" ? "Not now" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
