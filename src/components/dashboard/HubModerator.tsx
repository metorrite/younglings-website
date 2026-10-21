"use client";

import { useState, useTransition } from "react";
import { dangerButton, formatUtc, ghostButton, inputClass, Notice } from "@/components/admin/ui";
import type { HubModeration } from "@/lib/hubModeration";
import type { WelcomeActionResult } from "@/lib/jonnybot-admin";

type Result = WelcomeActionResult<HubModeration>;

export interface HubModeratorActions {
  unlist: (eventId: string, reason: string) => Promise<Result>;
  relist: (eventId: string) => Promise<Result>;
  resolve: (reportId: string, status: string) => Promise<Result>;
  bar: (serverId: string, reason: string) => Promise<Result>;
  lift: (serverId: string) => Promise<Result>;
}

/** The events hub's moderation for the bot's owner (T-218): reports about listed events, events taken off the hub, and servers barred from listing. */
export function HubModerator({ initial, actions }: { initial: HubModeration; actions: HubModeratorActions }) {
  const [data, setData] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  if (!data.canEdit) return null;

  const run = (work: () => Promise<Result>) =>
    start(async () => {
      setProblem(null);
      const result = await work();
      if (result.ok) setData(result.data);
      else setProblem(result.error);
    });
  const reason = (key: string) => reasons[key] ?? "";
  const setReason = (key: string, value: string) => setReasons({ ...reasons, [key]: value });

  return (
    <section className="space-y-4 rounded-xl border border-surface-border bg-surface p-5">
      <div>
        <h2 className="font-semibold text-gold">Events hub</h2>
        <p className="text-sm text-muted">Reports about open events, events taken off the hub, and servers that may not list events. The host sees the reason you give for taking an event down.</p>
      </div>
      {problem && <Notice tone="error" title={problem} />}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Open reports</h3>
        {data.reports.length === 0 && <p className="text-sm text-muted">No open reports.</p>}
        <ul className="space-y-3">
          {data.reports.map((r) => (
            <li key={r.id} className="space-y-2 rounded-lg border border-surface-border p-3 text-sm">
              <p>
                <span className="font-medium">{r.eventName}</span> <span className="text-muted">· {r.serverName ?? r.guildId} · {formatUtc(r.createdAt)}</span>
              </p>
              <p className="whitespace-pre-wrap break-words">{r.reason}</p>
              {r.reporter && <p className="text-xs text-muted">From {r.reporter}</p>}
              {!r.takenDown && (
                <input className={inputClass} placeholder="Reason the host will see (to take it down)" maxLength={300} value={reason(`e${r.eventId}`)} onChange={(e) => setReason(`e${r.eventId}`, e.target.value)} />
              )}
              <div className="flex flex-wrap gap-2">
                {!r.takenDown && (
                  <button type="button" className={dangerButton} disabled={pending || reason(`e${r.eventId}`).trim() === ""} onClick={() => run(() => actions.unlist(r.eventId, reason(`e${r.eventId}`)))}>
                    Take off the hub
                  </button>
                )}
                <button type="button" className={ghostButton} disabled={pending} onClick={() => run(() => actions.resolve(r.id, "DISMISSED"))}>
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Taken off the hub</h3>
        {data.takenDown.length === 0 && <p className="text-sm text-muted">None.</p>}
        <ul className="space-y-2">
          {data.takenDown.map((t) => (
            <li key={t.eventId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border p-3 text-sm">
              <span>
                <span className="font-medium">{t.eventName}</span> <span className="text-muted">· {t.serverName ?? t.guildId}{t.reason ? ` · ${t.reason}` : ""}</span>
              </span>
              <span className="flex flex-wrap gap-2">
                <button type="button" className={ghostButton} disabled={pending} onClick={() => run(() => actions.relist(t.eventId))}>
                  Put it back
                </button>
              </span>
              <span className="flex w-full flex-wrap items-center gap-2">
                <input className={`${inputClass} max-w-md`} placeholder="Reason (only you see it)" maxLength={300} value={reason(`s${t.guildId}`)} onChange={(e) => setReason(`s${t.guildId}`, e.target.value)} />
                <button type="button" className={dangerButton} disabled={pending || reason(`s${t.guildId}`).trim() === ""} onClick={() => run(() => actions.bar(t.guildId, reason(`s${t.guildId}`)))}>
                  Bar this server from the hub
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Servers that may not list events</h3>
        {data.barred.length === 0 && <p className="text-sm text-muted">None.</p>}
        <ul className="space-y-2">
          {data.barred.map((b) => (
            <li key={b.guildId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border p-3 text-sm">
              <span>
                <span className="font-medium">{b.serverName ?? b.guildId}</span> <span className="text-muted">· {b.reason} · {formatUtc(b.at)}</span>
              </span>
              <button type="button" className={ghostButton} disabled={pending} onClick={() => run(() => actions.lift(b.guildId))}>
                Let them list again
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
