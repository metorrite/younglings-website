"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

const subscribeHash = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const readHash = () => window.location.hash;

/**
 * Switches between pre-rendered panels. The content is built on the server and only shown or hidden here.
 *
 * With an `anchor`, a link to `#<anchor>-<tab id>` (say `#xp-breakdown-day`) scrolls here and opens that tab — so a
 * stat tile can take you straight to the matching breakdown. Clicking a tab yourself still wins until the link changes.
 */
export function Tabbed({ tabs, initial, anchor }: { tabs: { id: string; label: string; content: ReactNode }[]; initial?: string; anchor?: string }) {
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const [picked, setPicked] = useState<{ hash: string; id: string } | null>(null);
  const fromHash = anchor ? tabs.find((t) => hash === `#${anchor}-${t.id}`)?.id : undefined;
  const active = picked && picked.hash === hash ? picked.id : (fromHash ?? initial ?? tabs[0]?.id);
  const setActive = (id: string) => setPicked({ hash, id });

  return (
    <div>
      {/* One invisible landing spot per tab, so a link to any of them scrolls to the top of this panel. */}
      {anchor && tabs.map((tab) => <span key={tab.id} id={`${anchor}-${tab.id}`} className="block h-0 scroll-mt-36" />)}
      <div role="tablist" className="mb-4 inline-flex rounded-lg border border-surface-border bg-background/60 p-0.5 text-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={`rounded-md px-3 py-1 transition ${active === tab.id ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" hidden={active !== tab.id}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
