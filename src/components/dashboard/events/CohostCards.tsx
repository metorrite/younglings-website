"use client";

import { useEffect, useState, useTransition } from "react";
import { dangerButton, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { LocalTime } from "@/components/site/LocalTime";
import type { WelcomeActionResult } from "@/lib/jonnybot-admin";

type Call = (method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown) => Promise<WelcomeActionResult<unknown>>;

/** How a full event fills (T-220): the policy, seat quotas per server and when unfilled quota places are released. */
export interface FillQueueView {
  policy: "FIRST_COME" | "CLAN_FIRST" | "ROUND_ROBIN";
  hostQuota: number | null;
  releaseHours: number;
  quotaSum: number;
  maxParticipants: number;
  released: boolean;
  releaseAt: string | null;
  canChange: boolean;
}

/** The host's view of an event's co-hosts (bot route `events/{id}/cohosts`, T-219). */
export interface CohostView {
  cohosts: { guildId: string; name: string; status: "INVITED" | "ACCEPTED" | "DECLINED"; players: number; quota?: number | null }[];
  candidates: { guildId: string; name: string }[];
  max: number;
  canRemove: boolean;
  queue?: FillQueueView;
}

const POLICIES: { value: FillQueueView["policy"]; label: string }[] = [
  { value: "FIRST_COME", label: "First come, first served" },
  { value: "CLAN_FIRST", label: "Clan members first" },
  { value: "ROUND_ROBIN", label: "Round robin between servers" },
];

/** A quota box's text as a number: empty or 0 is no quota. */
function quotaOf(text: string): number | null {
  const n = Math.floor(Number(text.replace(/[^\d]/g, "")) || 0);
  return n > 0 ? n : null;
}

/**
 * "When it's full" on the Co-hosts card (T-220): how the waitlist fills (first come, clan first, or round robin between this server and its co-hosts),
 * optional seat quotas per server, and how long before signups close unfilled quota places are released. The bot checks the quotas again.
 */
function FillQueue({ view, onSave, pending }: { view: CohostView; onSave: (body: unknown) => void; pending: boolean }) {
  const q = view.queue;
  const accepted = view.cohosts.filter((c) => c.status === "ACCEPTED");
  const [policy, setPolicy] = useState<FillQueueView["policy"]>(q?.policy ?? "FIRST_COME");
  const [host, setHost] = useState(q?.hostQuota ? String(q.hostQuota) : "");
  const [hours, setHours] = useState(String(q?.releaseHours ?? 24));
  const [quotas, setQuotas] = useState<Record<string, string>>(() => Object.fromEntries(accepted.map((c) => [c.guildId, c.quota ? String(c.quota) : ""])));
  if (!q) return null;
  const sum = (quotaOf(host) ?? 0) + accepted.reduce((total, c) => total + (quotaOf(quotas[c.guildId] ?? "") ?? 0), 0);
  const tooMany = q.maxParticipants > 0 && sum > q.maxParticipants;
  const noLimit = q.maxParticipants <= 0;
  const save = () =>
    onSave({
      queue: policy,
      hostQuota: quotaOf(host),
      releaseHours: Math.min(Math.max(Math.floor(Number(hours) || 0), 0), 168),
      quotas: Object.fromEntries(accepted.map((c) => [c.guildId, quotaOf(quotas[c.guildId] ?? "")])),
    });

  return (
    <div className="space-y-3 rounded-lg border border-surface-border p-3">
      <div>
        <p className="text-sm font-medium">When it&apos;s full</p>
        <p className="text-xs text-muted">Who gets a place when someone leaves, and optional places kept for each server until the release.</p>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-muted">Waitlist order</span>
        <select className={inputClass} value={policy} onChange={(e) => setPolicy(e.target.value as FillQueueView["policy"])} disabled={pending || !q.canChange}>
          {POLICIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {policy === "ROUND_ROBIN" && <p className="text-xs text-muted">One player from this server, then one from each co-host, in turn. A server with nobody waiting is skipped.</p>}
      {noLimit ? (
        <p className="text-xs text-muted">Seat quotas need a player limit. Set &ldquo;Most players&rdquo; on the event first.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">Places kept for this server</span>
              <input className={inputClass} inputMode="numeric" placeholder="No quota" value={host} onChange={(e) => setHost(e.target.value)} disabled={pending || !q.canChange} />
            </label>
            {accepted.map((c) => (
              <label key={c.guildId} className="text-sm">
                <span className="mb-1 block text-xs text-muted">Places kept for {c.name}</span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  placeholder="No quota"
                  value={quotas[c.guildId] ?? ""}
                  onChange={(e) => setQuotas((all) => ({ ...all, [c.guildId]: e.target.value }))}
                  disabled={pending || !q.canChange}
                />
              </label>
            ))}
          </div>
          <p className={`text-xs ${tooMany ? "text-red-300" : "text-muted"}`}>
            Quotas add up to {sum} of {q.maxParticipants} places.{tooMany ? " That's more than the event takes." : ""} Empty means no quota for that server.
          </p>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted">Release unfilled quota places this many hours before signups close</span>
            <input className={`${inputClass} w-24`} inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} disabled={pending || !q.canChange} />
          </label>
          <p className="text-xs text-muted">
            {q.released ? (
              "Released: free places now go to whoever is waiting, whichever server they came through."
            ) : q.releaseAt ? (
              <>
                Places a server hasn&apos;t filled go to the waitlist at <LocalTime iso={q.releaseAt} />.
              </>
            ) : (
              "There's no signup deadline, so unfilled places are released when signups close."
            )}{" "}
            Staff adding someone late ignore quotas.
          </p>
        </div>
      )}
      {q.canChange && (
        <button type="button" className={primaryButton} disabled={pending || tooMany} onClick={save}>
          Save
        </button>
      )}
    </div>
  );
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

  const run = (method: "POST" | "PUT" | "DELETE", path: string, body?: unknown) =>
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
          {!over && (
            <FillQueue
              key={JSON.stringify(view.queue) + view.cohosts.map((c) => `${c.guildId}:${c.status}:${c.quota ?? ""}`).join(",")}
              view={view}
              pending={pending}
              onSave={(body) => run("PUT", `${base}/queue`, body)}
            />
          )}
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
  events: { eventId: string; name: string; host: string; status: string; startsAt: string | null; players: number; yours: { userId: string; name: string; waiting: boolean }[]; canRemove: boolean; quota?: number | null }[];
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
              {e.quota ? <span className="text-muted"> · {e.quota} places kept for your server until the release</span> : null}
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
