"use client";

import { useState, type DragEvent } from "react";
import { formatUtc, ghostButton, inputClass, Notice, primaryButton, StatusBadge } from "@/components/admin/ui";
import type { EventCall } from "@/components/dashboard/EventListView";
import { PlayerCard } from "@/components/dashboard/teams/TeamParts";
import { placement, teamsStep, totalsOf } from "@/lib/eventTeams";
import type { EventDetail, EventPlayer, TeamSuggestion } from "@/lib/eventTypes";

type Problem = { title: string; items: string[] } | null;

const withoutKey = (record: Record<string, string | null>, key: string) => {
  const next = { ...record };
  delete next[key];
  return next;
};

/**
 * Builds the teams of an event scored by team: players to move between the unplaced list and the teams (drag them, or use a card's Move list), a rating for how
 * strong each looks (their stats suggest one), how level the teams are, a suggestion to start from, and the word that the teams are final. A player who hasn't
 * passed the verification the event needs before teams sits apart, with the two ways through it. Every change is made by the bot, which checks every rule again.
 */
export function TeamBuilder({ detail, call, onDetail }: { detail: EventDetail; call: EventCall; onDetail: (next: EventDetail) => void }) {
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // moves the bot hasn't answered yet, shown as if they were done
  const [moves, setMoves] = useState<Record<string, string | null>>({});
  const [proposal, setProposal] = useState<TeamSuggestion | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);

  const base = `events/${detail.event.id}`;
  const e = detail.event;
  const finished = e.status === "DONE" || e.status === "CANCELLED";
  const editable = detail.editable;
  const finalised = Boolean(detail.setup.teamsFinalisedAt);
  const step = teamsStep(detail);

  const proposed: Record<string, string | null> = {};
  proposal?.moves.forEach((m) => {
    proposed[m.userId] = m.teamId;
  });
  const view = placement(detail, { ...proposed, ...moves });
  const teamName = (id: string | null) => detail.teams.find((t) => t.id === id)?.name ?? null;
  const nameOf = (p: EventPlayer) => p.userName ?? `Player ${p.userId}`;

  /** Sends one change; most of the bot's team routes answer with the whole event, which replaces what is shown. */
  async function send(method: "PUT" | "POST" | "DELETE", path: string, body: unknown, done?: string): Promise<boolean> {
    setProblem(null);
    setNote(null);
    setBusy(true);
    try {
      const result = await call(method, path, body);
      if (!result.ok) {
        setProblem({ title: result.error, items: result.problems });
        return false;
      }
      onDetail(result.data as EventDetail);
      if (done) setNote(done);
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function move(userId: string, teamId: string | null) {
    const player = detail.participants.find((p) => p.userId === userId);
    if (!player || player.waiting || (player.teamId ?? null) === teamId) return;
    setMoves((m) => ({ ...m, [userId]: teamId }));
    await send("PUT", `${base}/participants/${userId}`, { teamId });
    setMoves((m) => withoutKey(m, userId));
  }

  async function suggest() {
    setProblem(null);
    setNote(null);
    setBusy(true);
    try {
      const result = await call("POST", `${base}/teams/suggest`, {});
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      const suggestion = result.data as TeamSuggestion;
      if (suggestion.moves.length === 0) setNote(suggestion.notes.length > 0 ? suggestion.notes.join(" ") : "Nobody is left to place.");
      else setProposal(suggestion);
    } finally {
      setBusy(false);
    }
  }

  async function applyProposal() {
    if (!proposal) return;
    const ok = await send("PUT", `${base}/teams/assign`, { assignments: proposal.moves.map((m) => ({ userId: m.userId, teamId: m.teamId })) }, `${proposal.moves.length} players placed.`);
    if (ok) setProposal(null);
  }

  async function addTeam() {
    if (await send("POST", `${base}/teams`, { name: newName.trim() }, "Team added.")) setNewName("");
  }

  async function saveName() {
    if (!renaming) return;
    const current = detail.teams.find((t) => t.id === renaming.id)?.name;
    const value = renaming.value.trim();
    setRenaming(null);
    if (value && value !== current) await send("PUT", `${base}/teams/${renaming.id}`, { name: value });
  }

  const placed = detail.teams.reduce((sum, t) => sum + (view.byTeam.get(t.id)?.length ?? 0), 0);
  const totals = new Map(detail.teams.map((t) => [t.id, totalsOf(view.byTeam.get(t.id) ?? [])]));
  const populated = [...totals.values()].filter((t) => t.players > 0);
  const maxRating = Math.max(1, ...populated.map((t) => t.rating));
  const meanRating = populated.length === 0 ? 0 : populated.reduce((sum, t) => sum + t.rating, 0) / populated.length;

  const dropProps = (column: string, teamId: string | null) => ({
    onDragOver: (ev: DragEvent) => {
      if (dragging === null) return;
      ev.preventDefault();
      setOver(column);
    },
    onDragLeave: (ev: DragEvent) => {
      if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) setOver((o) => (o === column ? null : o));
    },
    onDrop: (ev: DragEvent) => {
      ev.preventDefault();
      const userId = ev.dataTransfer.getData("text/plain") || dragging;
      setDragging(null);
      setOver(null);
      if (userId) void move(userId, teamId);
    },
  });

  const cardFor = (p: EventPlayer, teamId: string | null, captainId: string | null) => (
    <PlayerCard
      key={p.userId}
      player={p}
      teams={detail.teams}
      teamId={teamId}
      isCaptain={captainId !== null && captainId === p.userId}
      proposedTeam={p.userId in proposed && !(p.userId in moves) ? teamName(proposed[p.userId]) : null}
      busy={busy}
      locked={finished}
      onMove={(to) => void move(p.userId, to)}
      onRate={(rating) => void send("PUT", `${base}/participants/${p.userId}/rating`, { rating })}
      onCaptain={teamId === null ? undefined : () => void send("PUT", `${base}/teams/${teamId}`, { captainId: captainId === p.userId ? null : p.userId })}
      onVerify={p.teamBlock && !p.waiting && detail.verification.required ? (state) => void send("PUT", `${base}/participants/${p.userId}/verification`, { state }, state === "verified" ? `${nameOf(p)} is verified.` : `${nameOf(p)} was let through.`) : undefined}
      dragging={dragging === p.userId}
      onDragStart={() => setDragging(p.userId)}
      onDragEnd={() => {
        setDragging(null);
        setOver(null);
      }}
    />
  );

  const columnClass = (column: string) => `space-y-2 rounded-xl border p-3 transition ${over === column ? "border-gold bg-gold/5" : "border-surface-border bg-surface"}`;

  return (
    <section className="space-y-4">
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface p-4">
        <div className="space-y-1 text-sm">
          <p className="font-medium">
            {detail.teams.length} {detail.teams.length === 1 ? "team" : "teams"} · {placed} of {placed + view.unassigned.length} players placed
            {proposal ? " (if you apply the suggestion)" : ""}
            {view.blocked.length > 0 ? ` · ${view.blocked.length} can't be placed yet` : ""}
            {view.waiting.length > 0 ? ` · ${view.waiting.length} waiting` : ""}
          </p>
          <p className="text-xs text-muted">Drag a player onto a team, or use the Move list on the card. Stars are how strong a player looks (their stats suggest one, and your own rating wins).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editable && (
            <button type="button" className={ghostButton} disabled={busy || detail.teams.length === 0 || view.unassigned.length === 0} onClick={() => void suggest()}>
              Suggest teams
            </button>
          )}
          {finalised ? (
            <>
              <StatusBadge tone="good">Teams are final</StatusBadge>
              {editable && (
                <button type="button" className={ghostButton} disabled={busy} onClick={() => void send("POST", `${base}/teams/reopen`, {}, "The teams are open again.")}>
                  Reopen
                </button>
              )}
            </>
          ) : (
            editable && (
              <button
                type="button"
                className={primaryButton}
                disabled={busy || step?.state === "WAITING"}
                title={step?.state === "WAITING" ? "Confirm the roster first" : undefined}
                onClick={() => void send("POST", `${base}/teams/finalise`, {}, "The teams are final.")}
              >
                Finalise the teams
              </button>
            )
          )}
        </div>
      </div>

      {step && (
        <div className="space-y-1 rounded-xl border border-surface-border p-4 text-sm">
          <p className="text-muted">{step.detail}</p>
          {finalised && detail.setup.teamsFinalisedAt && (
            <p className="text-xs text-muted">
              Called final {formatUtc(detail.setup.teamsFinalisedAt)}
              {detail.setup.teamsFinalisedBy ? ` by ${detail.setup.teamsFinalisedBy}` : ""}. Players can still be moved if something changes.
            </p>
          )}
        </div>
      )}

      {proposal && (
        <div className="space-y-2 rounded-xl border border-gold/60 bg-gold/5 p-4 text-sm">
          <p className="font-medium">A suggestion for {proposal.moves.length} players</p>
          <p className="text-xs text-muted">Strongest first, each onto the team that is weakest so far, so the teams come out level. The dashed cards show where each would go. Nothing is changed until you apply it.</p>
          {proposal.notes.map((n) => (
            <p key={n} className="text-xs text-amber-300">
              {n}
            </p>
          ))}
          <div className="flex gap-2">
            <button type="button" className={primaryButton} disabled={busy} onClick={() => void applyProposal()}>
              Apply the suggestion
            </button>
            <button type="button" className={ghostButton} disabled={busy} onClick={() => setProposal(null)}>
              Discard it
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <div className={columnClass("pool")} {...dropProps("pool", null)}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-semibold">Not on a team</h3>
            <span className="text-xs text-muted">{view.unassigned.length}</span>
          </div>
          <ul className="min-h-12 space-y-2">
            {view.unassigned.length === 0 && <li className="text-xs text-muted">{detail.participants.length === 0 ? "Nobody has joined yet." : "Everyone who can be placed is on a team."}</li>}
            {view.unassigned.map((p) => cardFor(p, null, null))}
          </ul>
        </div>

        {detail.teams.map((t) => {
          const players = view.byTeam.get(t.id) ?? [];
          const total = totals.get(t.id)!;
          const delta = populated.length > 1 && total.players > 0 ? Math.round(total.rating - meanRating) : 0;
          return (
            <div key={t.id} className={columnClass(t.id)} {...dropProps(t.id, t.id)}>
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  {renaming?.id === t.id ? (
                    <input
                      autoFocus
                      className={`${inputClass} py-1!`}
                      value={renaming.value}
                      maxLength={40}
                      aria-label="Team name"
                      onChange={(ev) => setRenaming({ id: t.id, value: ev.target.value })}
                      onBlur={() => void saveName()}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") void saveName();
                        if (ev.key === "Escape") setRenaming(null);
                      }}
                    />
                  ) : (
                    <h3 className="min-w-0 break-words font-semibold">
                      {editable ? (
                        <button type="button" className="text-left hover:text-gold" title="Rename the team" onClick={() => setRenaming({ id: t.id, value: t.name })}>
                          {t.name}
                        </button>
                      ) : (
                        t.name
                      )}
                    </h3>
                  )}
                  {editable && (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-red-400 underline disabled:opacity-40"
                      disabled={busy}
                      onClick={() => window.confirm(`Remove the team ${t.name}? Its players stay in the event, without a team.`) && void send("DELETE", `${base}/teams/${t.id}`, undefined, "Team removed.")}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="space-y-1" aria-label={`${t.name}: ${total.players} players, rating ${total.rating}`}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gold/80 transition-all" style={{ width: `${Math.round((total.rating / maxRating) * 100)}%` }} />
                  </div>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span>
                      {total.players} {total.players === 1 ? "player" : "players"} · rating {total.rating} · average {total.average.toFixed(1)}
                    </span>
                    {delta !== 0 && Math.abs(delta) >= 2 && <span className={delta > 0 ? "text-amber-300" : "text-sky-300"}>{delta > 0 ? `+${delta}` : delta} on the average team</span>}
                  </p>
                </div>
              </div>
              <ul className="min-h-12 space-y-2">
                {players.length === 0 && <li className="text-xs text-muted">Drop players here.</li>}
                {players.map((p) => cardFor(p, t.id, t.captainId))}
              </ul>
            </div>
          );
        })}

        {view.blocked.length > 0 && (
          <div className="space-y-2 rounded-xl border border-amber-500/40 bg-surface p-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">Not verified yet</h3>
              <span className="text-xs text-muted">{view.blocked.length}</span>
            </div>
            <p className="text-xs text-muted">This event asks players to be verified before teams are made. Verify them, or let one through, and they join the list.</p>
            <ul className="space-y-2">{view.blocked.map((p) => cardFor(p, null, null))}</ul>
          </div>
        )}
      </div>

      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${inputClass} max-w-xs`} placeholder="New team name" value={newName} maxLength={40} aria-label="New team name" onChange={(ev) => setNewName(ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && newName.trim() && void addTeam()} />
          <button type="button" className={ghostButton} disabled={busy || !newName.trim()} onClick={() => void addTeam()}>
            Add team
          </button>
        </div>
      )}

      {view.waiting.length > 0 && (
        <details className="rounded-xl border border-surface-border p-4 text-sm">
          <summary className="cursor-pointer font-medium">On the waitlist ({view.waiting.length})</summary>
          <p className="mt-2 text-xs text-muted">They have no place in the event yet, so they can&apos;t be on a team. They move up as places free up.</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {view.waiting.map((p) => (
              <li key={p.userId} className="rounded-lg border border-surface-border px-2.5 py-1 text-xs">
                {nameOf(p)}
              </li>
            ))}
          </ul>
        </details>
      )}
      {finished && <p className="text-sm text-muted">This event is over, so its teams can&apos;t be changed.</p>}
      {!finished && !editable && <p className="text-xs text-muted">The event has started: players can still be moved (a late player needs a team), but teams can&apos;t be added, renamed or removed.</p>}
    </section>
  );
}
