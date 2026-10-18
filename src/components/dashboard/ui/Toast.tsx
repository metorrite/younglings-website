"use client";

import { useEffect, useRef } from "react";

/**
 * A short confirmation that stays in view wherever the person is on a long page ("Approved and counted."), for what happened as the result of a button they just
 * pressed far from the top of the page. It goes away by itself after a few seconds, or with the close button, and is announced to screen readers without
 * taking the focus. Errors are not toasts: they stay on the page until dealt with.
 */
export function Toast({ message, onClose, seconds = 6 }: { message: string | null; onClose: () => void; seconds?: number }) {
  // the page redraws often (typing, the roster refreshing): the timer must run from when the message appeared, not restart on every redraw
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => close.current(), seconds * 1000);
    return () => clearTimeout(timer);
  }, [message, seconds]);

  if (!message) return null;
  return (
    <div role="status" className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg border border-emerald-500/50 bg-surface px-4 py-3 text-sm text-emerald-300 shadow-xl shadow-black/50">
      <span aria-hidden>✓</span>
      <span className="min-w-0 break-words">{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="ml-1 rounded px-1.5 text-muted transition hover:text-foreground">
        ×
      </button>
    </div>
  );
}
