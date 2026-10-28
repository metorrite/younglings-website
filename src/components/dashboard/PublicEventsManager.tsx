"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { formatUtc, Notice, StatusBadge } from "@/components/admin/ui";
import type { ClanEvents, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Scope = "NONE" | "ALLIANCE" | "PUBLIC";

const SCOPES: { value: Scope; label: string; detail: string }[] = [
  { value: "NONE", label: "Only us", detail: "Only your server sees it." },
  { value: "ALLIANCE", label: "Allies", detail: "Clans in an alliance with you see it on their dashboards. It is not public." },
  { value: "PUBLIC", label: "Everyone", detail: "Anyone can see it in the clan directory." },
];

export interface PublicEventsActions {
  setScope: (id: string, scope: Scope) => Promise<WelcomeActionResult<ClanEvents>>;
}

/** The server's upcoming Discord events, each with a switch for whether it is shown in the public clan directory. */
export function PublicEventsManager({ initial, profileHref, actions }: { initial: ClanEvents; profileHref: string; actions: PublicEventsActions }) {
  const [data, setData] = useState(initial);
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [pending, start] = useTransition();

  function change(id: string, scope: Scope) {
    setProblem(null);
    start(async () => {
      const result = await actions.setScope(id, scope);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setData(result.data);
    });
  }

  const visible = data.listing === "LISTED" || data.listing === "UNLISTED";

  return (
    <div className="space-y-6">
      {!visible && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          Your clan isn&apos;t shared publicly yet, so nobody outside your server sees these events even if you switch them on.{" "}
          <Link href={profileHref} className="text-gold hover:underline">
            Set up your clan profile
          </Link>
          .
        </div>
      )}
      {data.listing === "UNLISTED" && (
        <p className="text-sm text-muted">Your profile is unlisted: shared events show on your clan&apos;s own page, but not in the combined events feed.</p>
      )}
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}

      {data.events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">
          No upcoming events. Create one in Discord (Events in your server) and it will appear here.
        </p>
      ) : (
        <PanelGrid as="ul" min="22rem" gap="gap-3">
          {data.events.map((e) => (
            <li key={e.id} className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5">
              <div>
                <p className="font-semibold break-words">{e.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {formatUtc(e.startTime)}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={e.status === "ACTIVE" ? "good" : "muted"}>{e.status === "ACTIVE" ? "Happening now" : "Scheduled"}</StatusBadge>
                {e.scope === "PUBLIC" && <StatusBadge tone="good">Public</StatusBadge>}
                {e.scope === "ALLIANCE" && <StatusBadge tone="warn">Allies only</StatusBadge>}
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Who can see this event</p>
                <div role="radiogroup" aria-label={`Who can see ${e.name}`} className="inline-flex overflow-hidden rounded-lg border border-surface-border">
                  {SCOPES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={e.scope === s.value}
                      disabled={pending}
                      onClick={() => e.scope !== s.value && change(e.id, s.value)}
                      className={`px-3 py-1.5 text-sm transition disabled:opacity-60 ${e.scope === s.value ? "bg-gold/20 text-gold" : "hover:bg-white/5"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted">{SCOPES.find((s) => s.value === e.scope)?.detail}</p>
              </div>
            </li>
          ))}
        </PanelGrid>
      )}
    </div>
  );
}
