"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatUtc, Notice, StatusBadge } from "@/components/admin/ui";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { ClanEvents, WelcomeActionResult } from "@/lib/jonnybot-admin";

export interface PublicEventsActions {
  setShared: (id: string, shared: boolean) => Promise<WelcomeActionResult<ClanEvents>>;
}

/** The server's upcoming Discord events, each with a switch for whether it is shown in the public clan directory. */
export function PublicEventsManager({ initial, profileHref, actions }: { initial: ClanEvents; profileHref: string; actions: PublicEventsActions }) {
  const [data, setData] = useState(initial);
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [pending, start] = useTransition();

  function change(id: string, shared: boolean) {
    setProblem(null);
    start(async () => {
      const result = await actions.setShared(id, shared);
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
        <ul className="grid gap-3 xl:grid-cols-2">
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
                {e.shared && <StatusBadge tone="good">Shared</StatusBadge>}
              </div>
              <Toggle
                checked={e.shared}
                onChange={(on) => change(e.id, on)}
                disabled={pending}
                label="Show this event publicly"
                detail={e.shared ? "Anyone can see it in the clan directory." : "Only your server sees it."}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
