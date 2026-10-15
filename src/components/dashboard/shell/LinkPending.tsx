"use client";

import { useLinkStatus } from "next/link";

/**
 * A small spinner inside a navigation link, shown while the page that link opens is still loading. It only appears once the wait has gone on for a
 * moment (see .link-pending in globals.css), so a page that opens straight away looks exactly as it always did, and a slow one shows that the click
 * was received. The page already on screen stays put until the new one is ready. Must be rendered inside a next/link.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={pending ? "link-pending" : "hidden"} />;
}
