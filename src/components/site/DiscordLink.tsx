"use client";

import type { MouseEvent, ReactNode } from "react";
import { Tip, TipBody } from "@/components/ui/Tip";
import { discordAppUrl, discordWebUrl } from "@/lib/site";

/**
 * A link into Discord that opens the desktop app when it's running, and the web page when it isn't.
 *
 * It tries the `discord://` address first. If the app takes over, the browser loses focus and nothing more
 * happens; if nothing grabs focus within a moment, the normal web link opens in a new tab instead. Ctrl/⌘/
 * middle/right-clicks behave like any ordinary link (they open the web address).
 */
export function DiscordLink({ path, children, className, title }: { path: string; children: ReactNode; className?: string; title?: string }) {
  const web = discordWebUrl(path);

  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    let taken = false;
    const mark = () => {
      taken = true;
    };
    window.addEventListener("blur", mark, { once: true });
    document.addEventListener("visibilitychange", mark, { once: true });

    window.location.href = discordAppUrl(path);

    window.setTimeout(() => {
      window.removeEventListener("blur", mark);
      document.removeEventListener("visibilitychange", mark);
      if (!taken && !document.hidden) window.open(web, "_blank", "noopener,noreferrer");
    }, 1500);
  }

  return (
    <Tip content={<TipBody title={title ?? "Opens in Discord"}>{title ? "Opens in the Discord app if it's running." : "Uses the Discord app if it's running, otherwise your browser."}</TipBody>}>
      <a href={web} target="_blank" rel="noreferrer" onClick={open} className={className}>
        {children}
      </a>
    </Tip>
  );
}
