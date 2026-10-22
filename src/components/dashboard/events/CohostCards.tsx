"use client";

import { useEffect, useState, useTransition } from "react";
import { dangerButton, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { LocalTime } from "@/components/site/LocalTime";
import type { WelcomeActionResult } from "@/lib/jonnybot-admin";

type Call = (method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown) => Promise<WelcomeActionResult<unknown>>;

/** The host's view of an event's co-hosts (bot route `events/{id}/cohosts`, T-219). */
export interface CohostView {
  cohosts: { guildId: string; name: string; status: "INVITED" | "ACCEPTED" | "DECLINED"; players: number }[];
  candidates: { guildId: string; name: string }[];
  max: number;
  canRemove: boolean;
}

const STATUS: Record<string, { text: string; tone: "good" | "warn" | "plain" }> = {
  INVITED: { text: "Invited", tone: "warn" },
  ACCEPTED: { text: "Co-hosting", tone: "good" },
  DECLINED: { text: "Declined", tone: "plain" },
};

/**
 * The host's Co-hosts card on an event (T-219): servers in an alliance with this one can be invited to bring their players. Everything else (roles,
 * channels, proof) stays in this server, and their players join this Discord to take part.
 */
export function CohostsCard({ eventId, call, over }: { eventId: string; call: Call; over: boolean }) {
  const [view, setView] = useState<CohostView | null>(null);
  const [pick, setPick] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const base = `events/${eventId}/cohosts`;

  useEffect(() => {
    let live = true;
    void call("GET", base).then((r) => {
      if (!live) return;
      if (r.ok) setView(r.data as CohostView);
      else setProblem(r.error);
    });
    return () => {
      live = false;
    };
  }, [call, base]);

  const run = (method: "POST" | "DELETE", path: string, body?: unknown) =>
    start(async () => {
      setProblem(null);
      const r = await call(method, path, body);
      if (r.ok) {
        setView(r.data as CohostView);
        setPick("");
      } else setProblem(r.error);
    });

  const active = view?.cohosts.filter((c) => c.status !== "DECLINED").length ?? 0;
  return (
    <CollapsibleCard
      id="event-cohosts"
      title="Co-hosts"
      hint="Invite servers in an alliance with yours to bring their players. The event, its channels and its proof stay here; their players join this Discord to take part."
      summary={<Chip tone={active > 0 ? "good" : "plain"}>{active === 0 ? "None" : `${active} co-host${active === 1 ? "" : "s"}`}</Chip>}
    >
      {problem && <Notice tone="error" title={problem} />}
      {!view && !problem && <p className="text-sm text-muted">Loading…</p>}
      {view && (
        <div className="space-y-3">
          {view.cohosts.length === 0 && <p className="text-sm text-muted">No co-hosts yet.</p>}
          <ul className="space-y-2">
            {view.cohosts.map((c) => (
              <li key={c.guildId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border p-3 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <Chip tone={STATUS[c.status]?.tone ?? "plain"}>{STATUS[c.status]?.text ?? c.status}</Chip>
                  {c.status === "ACCEPTED" && <span className="text-xs text-muted">{c.players} joined through them</span>}
                </span>
                {view.canRemove && c.status !== "DECLINED" && !over && (
                  <button type="button" className={dangerButton} disabled={pending} onClick={() => run("DELETE", `${base}/${c.guildId}`)}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!view.canRemove && view.cohosts.length > 0 && <p className="text-xs text-muted">Signups have closed, so co-hosts stay. You can still remove their players on the Teams and players tab.</p>}
          {!over &&
            (view.candidates.length === 0 ? (
              <p className="text-xs text-muted">Servers you can invite are the ones in an alliance with yours (both accepted). Manage alliances on the Alliances page.</p>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted">Invite a server from your alliances</span>
                  <select className={inputClass} value={pick} onChange={(e) => setPick(e.target.value)} disabled={pending || active >= view.max}>
                    <option value="">Choose a server</option>
                    {view.candidates.map((c) => (
                      <option key={c.guildId} value={c.guildId}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className={primaryButton} disabled={pending || pick === "" || active >= view.max} onClick={() => run("POST", base, { guildId: pick })}>
                  Invite
                </button>
              </div>
            ))}
        </div>
      )}
    </CollapsibleCard>
  );
}

/** A co-host's view (bot route `cohost-events`, T-219): invitations, and the events it co-hosts with its own players only. */
export interface CohostingView {
  invitations: { eventId: string; name: string; host: string; status: string; startsAt: string | null }[];
  events: { eventId: string; name: string; host: string; status: string; startsAt: string | null; players: number; yours: { userId: string; name: string; waiting: boolean }[]; canRemove: boolean }[];
}

/** The Event manager's "Co-hosting" card for this server: accept or decline invitations, see the events it co-hosts and take its own players out. */
export function CohostingCard({ initial, call }: { initial: CohostingView; call: Call }) {
  const [view, setView] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (view.invitations.length === 0 && view.events.length === 0) return null;

  const run = (method: "POST" | "DELETE", path: string) =>
    start(async () => {
      setProblem(null);
      const r = await call(method, path);
      if (r.ok) setView(r.data as CohostingView);
      else setProblem(r.error);
    });

  return (
    <CollapsibleCard
      id="event-cohosting"
      title="Co-hosting"
      hint="Events other servers in your alliances run together with you. Your members join the host's Discord to take part."
      defaultOpen={view.invitations.length > 0}
      summary={
        <>
          {view.invitations.length > 0 && <Chip tone="warn">{view.invitations.length} invitation{view.invitations.length === 1 ? "" : "s"}</Chip>}
          {view.events.length > 0 && <Chip tone="good">{view.events.length} co-hosting</Chip>}
        </>
      }
    >
      {problem && <Notice tone="error" title={problem} />}
      <div className="space-y-4">
        {view.invitations.map((i) => (
          <div key={i.eventId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/40 p-3 text-sm">
            <span>
              <span className="font-medium">{i.name}</span> <span className="text-muted">· hosted by {i.host}{i.startsAt ? " · " : ""}</span>
              {i.startsAt && <LocalTime iso={i.startsAt} />}
            </span>
            <span className="flex gap-2">
              <button type="button" className={primaryButton} disabled={pending} onClick={() => run("POST", `cohost-events/${i.eventId}/accept`)}>
                Co-host it
              </button>
              <button type="button" className={ghostButton} disabled={pending} onClick={() => run("POST", `cohost-events/${i.eventId}/decline`)}>
                Decline
              </button>
            </span>
          </div>
        ))}
        {view.events.map((e) => (
          <div key={e.eventId} className="space-y-2 rounded-lg border border-surface-border p-3 text-sm">
            <p>
              <span className="font-medium">{e.name}</span> <span className="text-muted">· hosted by {e.host} · {e.players} players in all</span>
            </p>
            {e.yours.length === 0 ? (
              <p className="text-xs text-muted">None of your members have joined through your server yet.</p>
            ) : (
              <ul className="space-y-1">
                {e.yours.map((p) => (
                  <li key={p.userId} className="flex items-center justify-between gap-2">
                    <span>
                      {p.name}
                      {p.waiting ? <span className="text-xs text-muted"> (waiting for a place)</span> : null}
                    </span>
                    {e.canRemove && (
                      <button type="button" className={ghostButton} disabled={pending} onClick={() => run("DELETE", `cohost-events/${e.eventId}/players/${p.userId}`)}>
                        Take out
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}
