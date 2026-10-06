"use client";

import { useState, type ReactNode } from "react";

/** Switches between pre-rendered panels. The content is built on the server and only shown or hidden here. */
export function Tabbed({ tabs, initial }: { tabs: { id: string; label: string; content: ReactNode }[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);

  return (
    <div>
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
