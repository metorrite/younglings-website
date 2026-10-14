"use client";

import { useState, useTransition } from "react";
import { dangerButton, formatUtc, ghostButton, inputClass, Notice, primaryButton, StatusBadge } from "@/components/admin/ui";
import { STAGE_LABEL, type EventCall } from "@/components/dashboard/EventListView";
import type { EventAward, EventClaims, EventDetail, EventObjective, EventPrize, EventStandings, EventStatus } from "@/lib/eventTypes";

type Tab = "overview" | "board" | "objectives" | "players" | "progress" | "standings" | "prizes";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "board", label: "Board" },
  { key: "objectives", label: "Objectives" },
  { key: "players", label: "Teams and players" },
  { key: "progress", label: "Progress and proof" },
  { key: "standings", label: "Standings" },
  { key: "prizes", label: "Prizes and payouts" },
];

const KIND_LABEL = { HOME_CLAN: "Clan member", HOME_OTHER: "This server", PARTNER: "Other server" } as const;
const gp = (n: number) => n.toLocaleString("en-GB") + " gp";

const emptyObjective = (): EventObjective => ({ key: "", label: "", description: "", points: 10, evidence: "EITHER", target: 1, repeatLimit: 1, prerequisites: [] });
const emptyPrize = (): EventPrize => ({ id: "", place: 1, placeTo: 1, kind: "IN_GAME", description: "", amount: 0, percentOfPot: 0, split: "EQUAL" });

/** Runs one event: its stages, objectives, teams and players, progress and proof, standings, and prizes. */
export function EventManager({ initial, initialClaims, initialStandings, initialAwards, call }: { initial: EventDetail; initialClaims: EventClaims; initialStandings: EventStandings; initialAwards: EventAward[]; call: EventCall }) {
  const [detail, setDetail] = useState(initial);
  const [claims, setClaims] = useState<EventClaims>(initialClaims);
  const [standings, setStandings] = useState<EventStandings>(initialStandings);
  const [awards, setAwards] = useState<EventAward[]>(initialAwards);
  const [tab, setTab] = useState<Tab>("overview");
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const id = detail.event.id;
  const base = `events/${id}`;

  const [objs, setObjs] = useState<EventObjective[]>(initial.objectives);
  const [prizes, setPrizes] = useState<EventPrize[]>(initial.prizes);
  const [teamName, setTeamName] = useState("");
  const [addUser, setAddUser] = useState("");
  const [addKind, setAddKind] = useState("HOME_CLAN");
  const [addTeam, setAddTeam] = useState("");
  const [pUser, setPUser] = useState("");
  const [pObjective, setPObjective] = useState("");
  const [pAmount, setPAmount] = useState("1");
  const [pNote, setPNote] = useState("");
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState<string[]>([]);
  const [newSize, setNewSize] = useState("");

  async function refresh() {
    const [d, c, s, a] = await Promise.all([call("GET", base), call("GET", `${base}/claims`), call("GET", `${base}/standings`), call("GET", `${base}/awards`)]);
    if (d.ok) {
      const next = d.data as EventDetail;
      setDetail(next);
      setObjs(next.objectives);
      setPrizes(next.prizes);
    }
    if (c.ok) setClaims(c.data as EventClaims);
    if (s.ok) setStandings(s.data as EventStandings);
    if (a.ok) setAwards((a.data as { awards: EventAward[] }).awards);
  }

  function run(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body: unknown, message: string, after?: () => void) {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await call(method, path, body);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      const warning = (result.data as { signupWarning?: string } | null)?.signupWarning;
      if (warning) setProblem({ title: `Done, but the signup wasn't updated: ${warning}`, items: [] });
      else setNote(message);
      after?.();
      await refresh();
    });
  }

  const e = detail.event;
  const editable = detail.editable;
  const stageButton = (to: EventStatus) => (
    <button
      key={to}
      type="button"
      className={to === "CANCELLED" ? dangerButton : to === "RUNNING" || to === "SIGNUPS" ? primaryButton : ghostButton}
      disabled={pending}
      onClick={() => (to !== "CANCELLED" || window.confirm("Cancel this event? It can't be reopened.")) && run("POST", `${base}/status`, { status: to.toLowerCase() }, `The event is now ${STAGE_LABEL[to].toLowerCase()}.`)}
    >
      {to === "SIGNUPS" ? "Open signups" : to === "RUNNING" ? "Start the event" : to === "SCORING" ? "Move to scoring" : to === "DONE" ? "Finish" : to === "CANCELLED" ? "Cancel event" : `Back to ${STAGE_LABEL[to].toLowerCase()}`}
    </button>
  );
  const nameOf = (userId: string) => detail.participants.find((p) => p.userId === userId)?.userName ?? `Player ${userId}`;
  const active = detail.participants.filter((p) => !p.waiting);

  const num = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(/[, ]/g, "")));

  return (
    <div className="space-y-5">
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-surface-border bg-surface p-4">
        <StatusBadge tone={e.status === "RUNNING" ? "good" : e.status === "DONE" || e.status === "CANCELLED" ? "muted" : "warn"}>{STAGE_LABEL[e.status]}</StatusBadge>
        <span className="text-sm text-muted">
          {e.scoringMode === "TEAM" ? "Teams" : "Solo players"} · {e.scope === "PRIVATE" ? "Clan only" : e.scope === "ALLIANCE" ? "Clan and allies" : "Everyone"} · {active.length}
          {e.maxParticipants ? ` of ${e.maxParticipants}` : ""} players
          {detail.participants.length > active.length ? ` · ${detail.participants.length - active.length} waiting` : ""}
        </span>
        {detail.potVisible || detail.buyInEnabled ? <span className="text-sm">Pot: {gp(detail.pot)}</span> : null}
        <span className="ml-auto flex flex-wrap gap-2">{detail.nextStages.map(stageButton)}</span>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-surface-border">
        {TABS.filter((t) => t.key !== "board" || e.template === "bingo").map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm transition ${tab === t.key ? "border-b-2 border-gold text-gold" : "text-muted hover:text-foreground"}`}
          >
            {t.label}
            {t.key === "progress" && claims.pending.length > 0 ? ` (${claims.pending.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <section className="space-y-3 text-sm">
          {e.description && <p className="break-words whitespace-pre-wrap">{e.description}</p>}
          <dl className="grid gap-2 sm:grid-cols-2">
            <div><dt className="text-xs text-muted">Created</dt><dd>{formatUtc(e.createdAt)}</dd></div>
            <div><dt className="text-xs text-muted">Signups close</dt><dd>{e.config.signupClosesAt ? formatUtc(e.config.signupClosesAt) : "No deadline"}</dd></div>
            <div><dt className="text-xs text-muted">Who may join</dt><dd>{{ everyone: "Everyone, mixed freely", home: "Only this server", clanVsOutsiders: "Clan members apart from everyone else", separate: "Every kind on its own teams" }[e.config.teamPolicy ?? "everyone"] ?? e.config.teamPolicy}</dd></div>
            <div><dt className="text-xs text-muted">When full</dt><dd>{e.config.queue === "CLAN_FIRST" ? "Clan members first" : "First come, first served"}</dd></div>
            <div><dt className="text-xs text-muted">Buy-in</dt><dd>{e.config.buyIn?.enabled ? `${gp(e.config.buyIn.amount ?? 0)} per player` : "None"}</dd></div>
          </dl>
          <div className="space-y-2 rounded-xl border border-surface-border p-4">
            <p className="font-medium">Signup panel</p>
            {!detail.signup.attached ? (
              <p className="text-muted">
                {detail.signup.channelsChosen ? "No signup has been posted yet." : "No signup panel. Players are added by staff, or choose signup channels in the event settings when creating it."}
              </p>
            ) : (
              <p className="text-muted">
                {detail.signup.active ? "Open: players can sign up in Discord." : "Closed: it has stopped taking signups."} {detail.signup.entries} signed up so far.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {!detail.signup.attached && detail.signup.channelsChosen && e.status === "SIGNUPS" && (
                <button type="button" className={primaryButton} disabled={pending} onClick={() => run("POST", `${base}/signup`, {}, "The signup was posted in Discord.")}>
                  Post the signup now
                </button>
              )}
              {detail.signup.attached && (
                <button type="button" className={ghostButton} disabled={pending} onClick={() => run("POST", `${base}/signup/sync`, {}, "Everyone who signed up is now in the event.")}>
                  Add everyone who signed up
                </button>
              )}
            </div>
            <p className="text-xs text-muted">The bot also does this every minute. Staff can always add late entries by hand on the Teams and players tab.</p>
          </div>
          <p className="text-muted">
            {editable ? "Objectives, teams and prizes can be changed until the event starts." : "The event has started, so its setup is locked. Progress, proof and payouts still work."}
          </p>
        </section>
      )}

      {tab === "board" && e.template === "bingo" && e.config.board && (
        <section className="space-y-4">
          <p className="text-sm text-muted">
            A {e.config.board.size} × {e.config.board.size} board. Lock the tiles you like, then re-roll to change the rest. Tiles are ordinary objectives, so you can rename them or change their points on the Objectives tab.
          </p>
          <div className="grid max-w-3xl gap-2" style={{ gridTemplateColumns: `repeat(${e.config.board.size}, minmax(0, 1fr))` }}>
            {e.config.board.keys.map((key) => {
              const o = detail.objectives.find((x) => x.key === key);
              const done = standings.standings.filter((s) => (s.completions[key] ?? 0) > 0).length;
              const isLocked = locked.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!editable}
                  aria-pressed={isLocked}
                  title={editable ? (isLocked ? "Unlock this tile" : "Lock this tile for the next re-roll") : undefined}
                  onClick={() => setLocked(isLocked ? locked.filter((k) => k !== key) : [...locked, key])}
                  className={`flex aspect-square min-w-0 flex-col justify-between rounded-lg border p-2 text-left text-xs transition sm:text-sm ${isLocked ? "border-gold bg-gold/10" : "border-surface-border bg-surface"} ${editable ? "hover:border-gold/60" : ""}`}
                >
                  <span className="line-clamp-4 break-words font-medium">{o?.label ?? key}</span>
                  <span className="flex flex-wrap items-center justify-between gap-1 text-muted">
                    <span className="tabular-nums">{o?.points ?? 0} pts</span>
                    {isLocked ? <span className="text-gold">Locked</span> : !editable && done > 0 ? <span>{done} done</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {editable ? (
            <div className="flex flex-wrap items-end gap-2">
              <button type="button" className={primaryButton} disabled={pending} onClick={() => run("POST", `${base}/bingo`, { lockedKeys: locked }, locked.length ? "Re-rolled. Locked tiles stayed." : "Re-rolled the board.")}>
                Re-roll{locked.length ? ` (keep ${locked.length} locked)` : ""}
              </button>
              <select className={`${inputClass} max-w-40`} value={newSize} onChange={(ev) => setNewSize(ev.target.value)} aria-label="Board size">
                <option value="">Same size</option>
                {[3, 4, 5, 6, 7].filter((n) => n !== e.config.board?.size).map((n) => (
                  <option key={n} value={n}>
                    {n} × {n}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={ghostButton}
                disabled={pending || !newSize}
                onClick={() => window.confirm("Change the size? That makes a fresh board and drops locks.") && run("POST", `${base}/bingo`, { size: Number(newSize) }, "New board made.", () => { setNewSize(""); setLocked([]); })}
              >
                Change size
              </button>
              {locked.length > 0 && (
                <button type="button" className="text-sm text-muted underline" onClick={() => setLocked([])}>
                  Clear locks
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">The board is locked now that the event has started.</p>
          )}
          {(e.config.bonuses?.length ?? 0) > 0 && (
            <details>
              <summary className={`${ghostButton} inline-block cursor-pointer`}>Bonuses ({e.config.bonuses?.length})</summary>
              <ul className="mt-2 divide-y divide-surface-border text-sm">
                {e.config.bonuses?.map((b) => (
                  <li key={b.name} className="flex items-center justify-between gap-2 py-1.5">
                    <span>{b.name}</span>
                    <span className="tabular-nums text-muted">+{b.points}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {tab === "objectives" && (
        <section className="space-y-4">
          <p className="text-sm text-muted">Each objective is something a player or team can complete for points: a bingo tile, a boss kill, a step. Proof means members send a screenshot for you to approve; an organiser can always record progress by hand.</p>
          {objs.length === 0 && <p className="rounded-xl border border-dashed border-surface-border p-4 text-center text-sm text-muted">No objectives yet.</p>}
          <ul className="space-y-3">
            {objs.map((o, i) => (
              <li key={i} className="grid gap-2 rounded-xl border border-surface-border bg-surface p-4 md:grid-cols-[1fr_6rem_6rem_6rem_9rem]">
                <input className={inputClass} disabled={!editable} placeholder="Title" value={o.label} onChange={(ev) => setObjs(objs.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)))} />
                <input className={inputClass} disabled={!editable} inputMode="numeric" title="Points" placeholder="Points" value={o.points} onChange={(ev) => setObjs(objs.map((x, j) => (j === i ? { ...x, points: num(ev.target.value) } : x)))} />
                <input className={inputClass} disabled={!editable} inputMode="numeric" title="Amount needed to complete it" placeholder="Needed" value={o.target} onChange={(ev) => setObjs(objs.map((x, j) => (j === i ? { ...x, target: num(ev.target.value) } : x)))} />
                <input className={inputClass} disabled={!editable} inputMode="numeric" title="How many times it can count" placeholder="Times" value={o.repeatLimit} onChange={(ev) => setObjs(objs.map((x, j) => (j === i ? { ...x, repeatLimit: num(ev.target.value) } : x)))} />
                <select className={inputClass} disabled={!editable} value={o.evidence} onChange={(ev) => setObjs(objs.map((x, j) => (j === i ? { ...x, evidence: ev.target.value as EventObjective["evidence"] } : x)))}>
                  <option value="EITHER">Proof or automatic</option>
                  <option value="PROOF">Proof only</option>
                  <option value="AUTO">Automatic only</option>
                  <option value="ORGANISER">Organiser only</option>
                </select>
                <input className={`${inputClass} md:col-span-3`} disabled={!editable} placeholder="Description (optional)" value={o.description} onChange={(ev) => setObjs(objs.map((x, j) => (j === i ? { ...x, description: ev.target.value } : x)))} />
                <input
                  className={`${inputClass} md:col-span-1`}
                  disabled={!editable}
                  placeholder="Needs (keys, comma separated)"
                  value={o.prerequisites.join(", ")}
                  onChange={(ev) => setObjs(objs.map((x, j) => (j === i ? { ...x, prerequisites: ev.target.value.split(",").map((k) => k.trim()).filter(Boolean) } : x)))}
                />
                {editable && (
                  <button type="button" className={dangerButton} onClick={() => setObjs(objs.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                )}
                <p className="text-xs text-muted md:col-span-5">Key: {o.key || "made from the title when saved"}</p>
              </li>
            ))}
          </ul>
          {editable && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={ghostButton} onClick={() => setObjs([...objs, emptyObjective()])}>
                Add an objective
              </button>
              <button type="button" className={primaryButton} disabled={pending} onClick={() => run("PUT", `${base}/objectives`, { objectives: objs.map((o) => ({ ...o })) }, "Objectives saved.")}>
                Save objectives
              </button>
            </div>
          )}
        </section>
      )}

      {tab === "players" && (
        <section className="space-y-5">
          <div className="space-y-2">
            <h3 className="font-semibold">Teams</h3>
            <ul className="flex flex-wrap gap-2">
              {detail.teams.length === 0 && <li className="text-sm text-muted">No teams. Solo events don&apos;t need any.</li>}
              {detail.teams.map((t) => (
                <li key={t.id} className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-sm">
                  {t.name}
                  {editable && (
                    <button type="button" className="text-xs text-red-400 underline" onClick={() => run("DELETE", `${base}/teams/${t.id}`, undefined, "Team removed.")}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {editable && (
              <div className="flex flex-wrap gap-2">
                <input className={`${inputClass} max-w-xs`} placeholder="New team name" value={teamName} maxLength={40} onChange={(ev) => setTeamName(ev.target.value)} />
                <button type="button" className={ghostButton} disabled={pending || !teamName.trim()} onClick={() => run("POST", `${base}/teams`, { name: teamName }, "Team added.", () => setTeamName(""))}>
                  Add team
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Add a player</h3>
            <div className="flex flex-wrap gap-2">
              <input className={`${inputClass} max-w-xs`} placeholder="Discord user ID" inputMode="numeric" value={addUser} onChange={(ev) => setAddUser(ev.target.value)} />
              <select className={`${inputClass} max-w-48`} value={addKind} onChange={(ev) => setAddKind(ev.target.value)}>
                <option value="HOME_CLAN">Clan member</option>
                <option value="HOME_OTHER">In this server, not the clan</option>
                <option value="PARTNER">From another server</option>
              </select>
              <select className={`${inputClass} max-w-48`} value={addTeam} onChange={(ev) => setAddTeam(ev.target.value)}>
                <option value="">No team</option>
                {detail.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button type="button" className={primaryButton} disabled={pending || !addUser.trim()} onClick={() => run("POST", `${base}/participants`, { userId: addUser.trim(), kind: addKind, teamId: addTeam || null }, "Player added.", () => setAddUser(""))}>
                Add
              </button>
            </div>
            <p className="text-xs text-muted">Staff can add players any time, including after signups close. A full event puts them on the waitlist.</p>
          </div>

          <ul className="divide-y divide-surface-border">
            {detail.participants.length === 0 && <li className="py-3 text-sm text-muted">Nobody has joined yet.</li>}
            {detail.participants.map((p) => (
              <li key={p.userId} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{p.userName ?? `Player ${p.userId}`}</span> <span className="text-xs text-muted">{KIND_LABEL[p.kind]}</span>
                  {p.waiting && <span className="ml-2"><StatusBadge tone="warn">Waiting</StatusBadge></span>}
                </span>
                <select className={`${inputClass} max-w-40`} value={p.teamId ?? ""} onChange={(ev) => run("PUT", `${base}/participants/${p.userId}`, { teamId: ev.target.value || null }, "Team changed.")}>
                  <option value="">No team</option>
                  {detail.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {detail.buyInEnabled && (
                  <span className="flex items-center gap-2">
                    <StatusBadge tone={p.buyIn === "PAID" ? "good" : "muted"}>{p.buyIn === "PAID" ? "Paid" : p.buyIn === "REFUNDED" ? "Refunded" : "Buy-in due"}</StatusBadge>
                    {p.buyIn === "DUE" && <button type="button" className="text-xs text-gold underline" onClick={() => run("PUT", `${base}/participants/${p.userId}/buyin`, { status: "paid" }, "Buy-in marked paid.")}>Mark paid</button>}
                    {p.buyIn === "PAID" && <button type="button" className="text-xs text-gold underline" onClick={() => window.confirm("Mark this buy-in as refunded?") && run("PUT", `${base}/participants/${p.userId}/buyin`, { status: "refunded" }, "Buy-in marked refunded.")}>Refund</button>}
                  </span>
                )}
                <button type="button" className="text-xs text-red-400 underline" onClick={() => window.confirm("Remove this player?") && run("DELETE", `${base}/participants/${p.userId}`, undefined, "Player removed.")}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "progress" && (
        <section className="space-y-5">
          <div className="space-y-2">
            <h3 className="font-semibold">Record progress by hand</h3>
            {e.status !== "RUNNING" && <p className="text-sm text-muted">Progress counts while the event is running.</p>}
            <div className="flex flex-wrap gap-2">
              <select className={`${inputClass} max-w-52`} value={pUser} onChange={(ev) => setPUser(ev.target.value)}>
                <option value="">Player…</option>
                {active.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.userName ?? p.userId}
                  </option>
                ))}
              </select>
              <select className={`${inputClass} max-w-52`} value={pObjective} onChange={(ev) => setPObjective(ev.target.value)}>
                <option value="">Objective…</option>
                {detail.objectives.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input className={`${inputClass} w-24!`} inputMode="numeric" value={pAmount} onChange={(ev) => setPAmount(ev.target.value)} aria-label="Amount (negative takes progress back)" />
              <input className={`${inputClass} max-w-xs`} placeholder="Note (optional)" value={pNote} maxLength={300} onChange={(ev) => setPNote(ev.target.value)} />
              <button type="button" className={primaryButton} disabled={pending || !pUser || !pObjective} onClick={() => run("POST", `${base}/progress`, { userId: pUser, objective: pObjective, amount: num(pAmount) || 1, note: pNote }, "Progress recorded.", () => setPNote(""))}>
                Record
              </button>
            </div>
            <p className="text-xs text-muted">A negative amount takes earlier progress back. Objectives that need others finished first stay locked until then.</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Proof waiting for review</h3>
            {claims.pending.length === 0 ? (
              <p className="text-sm text-muted">Nothing is waiting.</p>
            ) : (
              <ul className="grid gap-3 xl:grid-cols-2">
                {claims.pending.map((c) => (
                  <li key={c.id} className="space-y-2 rounded-xl border border-surface-border bg-surface p-4 text-sm">
                    <p>
                      <span className="font-medium">{c.userName ?? nameOf(c.userId)}</span> on <span className="font-medium">{detail.objectives.find((o) => o.key === c.objective)?.label ?? c.objective}</span> (×{c.amount})
                    </p>
                    {c.note && <p className="break-words text-muted">{c.note}</p>}
                    {c.proofUrl && (
                      <a href={c.proofUrl} target="_blank" rel="noreferrer noopener" className="text-gold underline">
                        View proof
                      </a>
                    )}
                    <input className={inputClass} placeholder="Note for the player (required to deny)" value={decisions[c.id] ?? ""} maxLength={300} onChange={(ev) => setDecisions({ ...decisions, [c.id]: ev.target.value })} />
                    <div className="flex gap-2">
                      <button type="button" className={primaryButton} disabled={pending} onClick={() => run("POST", `${base}/claims/${c.id}/approve`, { note: decisions[c.id] ?? "" }, "Approved and counted.")}>
                        Approve
                      </button>
                      <button type="button" className={dangerButton} disabled={pending || !(decisions[c.id] ?? "").trim()} onClick={() => run("POST", `${base}/claims/${c.id}/deny`, { note: decisions[c.id] ?? "" }, "Denied.")}>
                        Deny
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {claims.decided.length > 0 && (
              <details>
                <summary className={`${ghostButton} inline-block cursor-pointer`}>Recently decided ({claims.decided.length})</summary>
                <ul className="mt-2 divide-y divide-surface-border text-sm">
                  {claims.decided.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span>{c.userName ?? nameOf(c.userId)} · {detail.objectives.find((o) => o.key === c.objective)?.label ?? c.objective}</span>
                      <StatusBadge tone={c.status === "APPROVED" ? "good" : "warn"}>{c.status === "APPROVED" ? "Approved" : "Denied"}</StatusBadge>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </section>
      )}

      {tab === "standings" && (
        <section className="space-y-3">
          {standings.standings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">No progress yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">{standings.scoringMode === "TEAM" ? "Team" : "Player"}</th>
                    <th className="px-4 py-3 text-right">Points</th>
                    <th className="px-4 py-3 text-right">Objectives done</th>
                    {standings.standings.some((s) => (s.bonuses ?? []).length > 0) && <th className="px-4 py-3">Bonuses</th>}
                  </tr>
                </thead>
                <tbody>
                  {standings.standings.map((s) => (
                    <tr key={s.subject} className="border-t border-surface-border">
                      <td className="px-4 py-2 tabular-nums text-muted">{s.rank}</td>
                      <td className="px-4 py-2 font-medium">{s.label}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{s.points.toLocaleString("en-GB")}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted">{s.objectivesCompleted}</td>
                      {standings.standings.some((x) => (x.bonuses ?? []).length > 0) && <td className="px-4 py-2 text-xs text-muted">{(s.bonuses ?? []).join(", ")}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "prizes" && (
        <section className="space-y-5">
          <p className="text-sm text-muted">
            A prize goes to one place, or to a range of places. For team events a prize is split equally, given in full to each member, or given to the captain. A prize can be a fixed amount or a share of the pot (needs a buy-in).
          </p>
          <ul className="space-y-3">
            {prizes.length === 0 && <li className="text-sm text-muted">No prizes yet.</li>}
            {prizes.map((p, i) => (
              <li key={i} className="grid gap-2 rounded-xl border border-surface-border bg-surface p-4 sm:grid-cols-2 2xl:grid-cols-[5rem_5rem_9rem_1fr_7rem_6rem_9rem]">
                <input className={inputClass} disabled={!detail.editable && awards.length > 0} inputMode="numeric" title="First place" value={p.place} onChange={(ev) => setPrizes(prizes.map((x, j) => (j === i ? { ...x, place: num(ev.target.value), placeTo: Math.max(x.placeTo, num(ev.target.value)) } : x)))} />
                <input className={inputClass} inputMode="numeric" title="Last place" value={p.placeTo} onChange={(ev) => setPrizes(prizes.map((x, j) => (j === i ? { ...x, placeTo: num(ev.target.value) } : x)))} />
                <select className={inputClass} value={p.kind} onChange={(ev) => setPrizes(prizes.map((x, j) => (j === i ? { ...x, kind: ev.target.value as EventPrize["kind"] } : x)))}>
                  <option value="IN_GAME">In game</option>
                  <option value="CLAN_POINTS">Clan points</option>
                  <option value="OTHER">Other</option>
                </select>
                <input className={`${inputClass} sm:col-span-2 2xl:col-span-1`} placeholder="What it is (e.g. Zaros godsword)" value={p.description} onChange={(ev) => setPrizes(prizes.map((x, j) => (j === i ? { ...x, description: ev.target.value } : x)))} />
                <input className={inputClass} inputMode="numeric" title="Fixed amount (points or gp)" placeholder="Amount" value={p.amount} onChange={(ev) => setPrizes(prizes.map((x, j) => (j === i ? { ...x, amount: num(ev.target.value) } : x)))} />
                <input className={inputClass} inputMode="decimal" title="Share of the pot, in percent" placeholder="% of pot" value={p.percentOfPot / 100} onChange={(ev) => setPrizes(prizes.map((x, j) => (j === i ? { ...x, percentOfPot: Math.round(Number(ev.target.value || 0) * 100) } : x)))} />
                <select className={inputClass} value={p.split} onChange={(ev) => setPrizes(prizes.map((x, j) => (j === i ? { ...x, split: ev.target.value as EventPrize["split"] } : x)))}>
                  <option value="EQUAL">Team splits equally</option>
                  <option value="EACH">Each member gets it</option>
                  <option value="CAPTAIN">Captain gets it</option>
                </select>
                <button type="button" className={dangerButton} onClick={() => setPrizes(prizes.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ghostButton} onClick={() => setPrizes([...prizes, { ...emptyPrize(), place: prizes.length + 1, placeTo: prizes.length + 1 }])}>
              Add a prize
            </button>
            <button type="button" className={primaryButton} disabled={pending} onClick={() => run("PUT", `${base}/prizes`, { prizes }, "Prizes saved.")}>
              Save prizes
            </button>
          </div>

          <div className="space-y-3 border-t border-surface-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Payouts</h3>
              <button type="button" className={ghostButton} disabled={pending || (e.status !== "SCORING" && e.status !== "DONE")} onClick={() => run("POST", `${base}/awards`, {}, "Payouts worked out from the standings.")}>
                Work out who is owed what
              </button>
            </div>
            {e.status !== "SCORING" && e.status !== "DONE" && <p className="text-sm text-muted">Move the event to scoring first. Then payouts are worked out from the final standings, and working them out again changes nothing.</p>}
            <ul className="divide-y divide-surface-border">
              {awards.map((a) => (
                <li key={a.id} className="space-y-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="text-muted tabular-nums">#{a.place}</span> <span className="font-medium">{a.userName ?? `Player ${a.userId}`}</span>:{" "}
                      {a.kind === "CLAN_POINTS" ? `${a.amount.toLocaleString("en-GB")} clan points` : a.amount > 0 ? `${a.description || "Prize"} (${gp(a.amount)})` : a.description}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge tone={a.status === "PAID" ? "good" : "muted"}>{{ PENDING: "Not paid yet", PAID: "Paid", REVOKED: "Revoked", REFUNDED: "Refunded" }[a.status]}</StatusBadge>
                      {a.status === "PENDING" && <button type="button" className="text-xs text-gold underline" onClick={() => run("POST", `${base}/awards/${a.id}/status`, { status: "paid" }, "Marked as paid.")}>Mark paid</button>}
                      {(a.status === "PENDING" || a.status === "PAID") && <button type="button" className="text-xs text-red-400 underline" onClick={() => window.confirm("Revoke this prize?") && run("POST", `${base}/awards/${a.id}/status`, { status: "revoked" }, "Revoked.")}>Revoke</button>}
                      {a.status === "PAID" && <button type="button" className="text-xs text-red-400 underline" onClick={() => window.confirm("Refund this prize?") && run("POST", `${base}/awards/${a.id}/status`, { status: "refunded" }, "Refunded.")}>Refund</button>}
                    </span>
                  </div>
                  {a.history.length > 0 && (
                    <p className="text-xs text-muted">
                      {a.history.map((h) => `${h.from.toLowerCase()} → ${h.to.toLowerCase()}${h.byName ? ` by ${h.byName}` : ""}${h.note ? ` (${h.note})` : ""}`).join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
