"use client";

/* eslint-disable @next/next/no-img-element -- 30px pixel-art item icons from /public/items; next/image would only blur them */

import { askDialog, confirmDialog } from "@/components/ui/Dialogs";
import { useEffect, useRef, useState, useTransition } from "react";
import { dangerButton, formatUtc, ghostButton, inputClass, Notice, primaryButton, StatusBadge } from "@/components/admin/ui";
import { STAGE_LABEL, type EventCall } from "@/components/dashboard/EventListView";
import { ChannelSelect } from "@/components/admin/pickers";
import { BingoLookPicker } from "@/components/dashboard/BingoLookPicker";
import { EventSetupFields, GATES, setupFromConfig, setupToConfig, type SetupDraft } from "@/components/dashboard/EventSetupFields";
import { PrizeListEditor } from "@/components/dashboard/setup/PrizeListEditor";
import { ChannelsTab } from "@/components/dashboard/space/ChannelsTab";
import { WrapupTab } from "@/components/dashboard/space/WrapupTab";
import { TeamBuilder } from "@/components/dashboard/teams/TeamBuilder";
import { BINGO_LOOKS, PLAIN_LOOK, type EventAward, type EventClaims, type EventDetail, type EventObjective, type EventPrize, type EventStandings, type EventStatus, type BingoCatalog } from "@/lib/eventTypes";
import { choicesOf, type GuildStructure } from "@/lib/jonnybot-admin";

type Tab = "overview" | "board" | "objectives" | "teams" | "channels" | "players" | "progress" | "standings" | "prizes" | "wrapup";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "board", label: "Board" },
  { key: "objectives", label: "Objectives" },
  { key: "teams", label: "Team builder" },
  { key: "channels", label: "Channels" },
  { key: "players", label: "Teams and players" },
  { key: "progress", label: "Progress and proof" },
  { key: "standings", label: "Standings" },
  { key: "prizes", label: "Prizes and payouts" },
  { key: "wrapup", label: "Wrap-up" },
];

const KIND_LABEL = { HOME_CLAN: "Clan member", HOME_OTHER: "This server", PARTNER: "Other server" } as const;
const gp = (n: number) => n.toLocaleString("en-GB") + " gp";

const emptyObjective = (): EventObjective => ({ key: "", label: "", description: "", points: 10, evidence: "EITHER", target: 1, repeatLimit: 1, prerequisites: [] });

/** Runs one event: its stages, objectives, teams and players, progress and proof, standings, and prizes. */
export function EventManager({ initial, initialClaims, initialStandings, initialAwards, structure, call }: { initial: EventDetail; initialClaims: EventClaims; initialStandings: EventStandings; initialAwards: EventAward[]; structure?: GuildStructure; call: EventCall }) {
  const [detail, setDetail] = useState(initial);
  const [claims, setClaims] = useState<EventClaims>(initialClaims);
  const [standings, setStandings] = useState<EventStandings>(initialStandings);
  const [awards, setAwards] = useState<EventAward[]>(initialAwards);
  const [tab, setTabNow] = useState<Tab>("overview");
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const id = detail.event.id;
  const base = `events/${id}`;

  /** Changing tab leaves the last tab's message behind: an error from one tab doesn't follow you around (or show up twice when the next tab fails the same way). */
  function setTab(next: Tab) {
    setProblem(null);
    setNote(null);
    setTabNow(next);
  }

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
  const [catalog, setCatalog] = useState<BingoCatalog | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftBoss, setDraftBoss] = useState("");
  const [draftItem, setDraftItem] = useState("");
  const [draftCustom, setDraftCustom] = useState("");
  const [draftPoints, setDraftPoints] = useState("25");
  const [boardChannel, setBoardChannel] = useState<string | null>(initial.event.config.boardChannelId ?? null);
  const [reviewChannel, setReviewChannel] = useState<string | null>(initial.event.config.reviewChannelId ?? null);
  const [newSize, setNewSize] = useState("");
  const [newShape, setNewShape] = useState("");
  const [pickedLook, setPickedLook] = useState<string | null>(null);
  const [organiser, setOrganiser] = useState("");
  const [tplName, setTplName] = useState(initial.event.name.slice(0, 60));
  const [tplNote, setTplNote] = useState("");
  const [setupDraft, setSetupDraft] = useState<SetupDraft>(setupFromConfig(initial.event.config));

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

  /**
   * Asks the bot for the event again without touching anything being edited (the objectives and prizes you are typing stay as they are), so players who
   * signed up, left or were removed in Discord show up here. Says so when the number of players changed.
   */
  async function reload(announce: boolean) {
    const [d, c] = await Promise.all([call("GET", base), call("GET", `${base}/claims`)]);
    if (d.ok) {
      const next = d.data as EventDetail;
      setDetail((before) => {
        const was = before.participants.filter((p) => !p.waiting).length;
        const now = next.participants.filter((p) => !p.waiting).length;
        if (announce && was !== now) setNote(now > was ? `${now - was} ${now - was === 1 ? "player" : "players"} joined.` : `${was - now} ${was - now === 1 ? "player" : "players"} left.`);
        return JSON.stringify(before) === JSON.stringify(next) ? before : next;
      });
    }
    if (c.ok) setClaims((before) => (JSON.stringify(before) === JSON.stringify(c.data) ? before : (c.data as EventClaims)));
    setRefreshedAt(new Date());
  }

  const latest = useRef({ pending, status: detail.event.status, reload });
  useEffect(() => {
    latest.current = { pending, status: detail.event.status, reload };
  });
  // while the page is open the roster keeps itself fresh: the bot adds Discord signups every minute and staff can change things elsewhere
  useEffect(() => {
    const timer = setInterval(() => {
      const now = latest.current;
      if (document.visibilityState !== "visible" || now.pending || now.status === "DONE" || now.status === "CANCELLED") return;
      void now.reload(true);
    }, 15_000);
    return () => clearInterval(timer);
  }, []);

  /** `saveChannelsFirst`: the channel choices on screen are saved before this, so a choice made but not saved can't make the action do nothing. */
  function run(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body: unknown, message: string | ((data: unknown) => string), after?: () => void, saveChannelsFirst = false) {
    setProblem(null);
    setNote(null);
    start(async () => {
      if (saveChannelsFirst && channelsChanged) {
        const saved = await call("PUT", base, { config: channelConfig() });
        if (!saved.ok) return setProblem({ title: `The channels couldn't be saved: ${saved.error}`, items: saved.problems });
      }
      const result = await call(method, path, body);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      const warning = (result.data as { signupWarning?: string } | null)?.signupWarning;
      if (warning) setProblem({ title: `Done, but the signup wasn't updated: ${warning}`, items: [] });
      else setNote(typeof message === "function" ? message(result.data) : message);
      after?.();
      await refresh();
    });
  }

  const e = detail.event;
  const editable = detail.editable;
  // what the two channel pickers show against what the event has saved
  const channelsChanged = (boardChannel ?? null) !== (e.config.boardChannelId ?? null) || (reviewChannel ?? null) !== (e.config.reviewChannelId ?? null);
  function channelConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = { ...e.config };
    if (boardChannel) config.boardChannelId = boardChannel;
    else delete config.boardChannelId;
    if (reviewChannel) config.reviewChannelId = reviewChannel;
    else delete config.reviewChannelId;
    return config;
  }

  function editTile(key: string) {
    const o = detail.objectives.find((x) => x.key === key);
    const info = detail.tiles.find((x) => x.key === key);
    setEditing(key);
    setDraftBoss(info?.boss ?? "");
    setDraftItem(info?.item ?? "");
    setDraftCustom(info?.boss ? "" : (o?.label ?? ""));
    setDraftPoints(String(o?.points ?? 25));
    if (!catalog) {
      call("GET", "events/bingo-catalog").then((r) => {
        if (r.ok) setCatalog(r.data as BingoCatalog);
        else setProblem({ title: r.error, items: r.problems });
      });
    }
  }

  function saveTile(number: number) {
    const bossChosen = catalog?.bosses.some((b) => b.name === draftBoss);
    const label = bossChosen ? `${draftBoss}: ${draftItem}` : draftCustom.trim();
    run("POST", `${base}/bingo`, { replace: { number, label, points: num(draftPoints) } }, `Tile ${number} changed.`, () => setEditing(null));
  }
  const stageButton = (to: EventStatus) => (
    <button
      key={to}
      type="button"
      className={to === "CANCELLED" ? dangerButton : to === "RUNNING" || to === "SIGNUPS" ? primaryButton : ghostButton}
      disabled={pending}
      onClick={async () => (to !== "CANCELLED" || (await confirmDialog({ title: "Cancel this event?", body: "It can't be reopened.", confirmLabel: "Cancel event", tone: "danger" }))) && run("POST", `${base}/status`, { status: to.toLowerCase() }, `The event is now ${STAGE_LABEL[to].toLowerCase()}.`, undefined, true)}
    >
      {to === "SIGNUPS" ? "Open signups" : to === "RUNNING" ? "Start the event" : to === "SCORING" ? "Move to scoring" : to === "DONE" ? "Finish" : to === "CANCELLED" ? "Cancel event" : `Back to ${STAGE_LABEL[to].toLowerCase()}`}
    </button>
  );
  const layout = detail.layout ?? null;
  /** The look the board's settings name, or null when it names none (it is drawn the way boards were before looks existed). */
  const currentLook = e.config.board?.look ?? null;
  /** One tile of the board with its lock, edit and points, the same on a square grid and on a shaped board. */
  const renderTile = (key: string, index: number) => {
              const o = detail.objectives.find((x) => x.key === key);
              const info = detail.tiles.find((x) => x.key === key);
              const done = standings.standings.filter((s) => (s.completions[key] ?? 0) > 0).length;
              const isLocked = locked.includes(key);
              const isEditing = editing === key;
              const bossItems = catalog?.bosses.find((bo) => bo.name === draftBoss)?.items ?? [];
              const draftIcon = bossItems.find((it) => it.name === draftItem && it.icon)?.key;
              return (
                <div
                  key={key}
                  className={`flex min-w-0 flex-col gap-2 rounded-lg border p-3 text-xs sm:text-sm ${isEditing ? "col-span-full sm:col-span-2" : ""} ${isLocked ? "border-gold bg-gold/10" : "border-surface-border bg-surface"}`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span className="tabular-nums">#{index + 1}</span>
                    {editable && !isEditing && (
                      <span className="flex gap-3">
                        <button type="button" aria-pressed={isLocked} className={isLocked ? "text-gold underline" : "underline"} title="Locked tiles stay put when you re-roll" onClick={() => setLocked(isLocked ? locked.filter((k) => k !== key) : [...locked, key])}>
                          {isLocked ? "Locked" : "Lock"}
                        </button>
                        <button type="button" className="text-gold underline" onClick={() => editTile(key)}>
                          Edit
                        </button>
                      </span>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <select className={inputClass} value={draftBoss} onChange={(ev) => { setDraftBoss(ev.target.value); setDraftItem(""); }} aria-label="Boss">
                        <option value="">Custom tile (type it)</option>
                        {catalog?.bosses.map((bo) => (
                          <option key={bo.name} value={bo.name}>
                            {bo.name}
                          </option>
                        ))}
                        {draftBoss && catalog && !catalog.bosses.some((bo) => bo.name === draftBoss) && <option value={draftBoss}>{draftBoss}</option>}
                      </select>
                      {draftBoss && bossItems.length > 0 ? (
                        <div className="flex items-center gap-2">
                          {draftIcon && <img src={`/items/${draftIcon}.png`} alt="" width={32} height={32} className="shrink-0 [image-rendering:pixelated]" />}
                          <select className={inputClass} value={draftItem} onChange={(ev) => setDraftItem(ev.target.value)} aria-label="Item from this boss's loot table">
                            <option value="">Choose an item</option>
                            {bossItems.map((it) => (
                              <option key={it.key} value={it.name}>
                                {it.name}
                                {it.rarity ? ` (${it.rarity})` : ""}
                              </option>
                            ))}
                            {draftItem && !bossItems.some((it) => it.name === draftItem) && <option value={draftItem}>{draftItem}</option>}
                          </select>
                        </div>
                      ) : (
                        <input className={inputClass} placeholder="Tile text, e.g. Reach 99 Slayer" value={draftCustom} maxLength={80} onChange={(ev) => setDraftCustom(ev.target.value)} aria-label="Tile text" />
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1 text-xs text-muted">
                          Points
                          <input className={`${inputClass} w-20!`} inputMode="numeric" value={draftPoints} onChange={(ev) => setDraftPoints(ev.target.value)} />
                        </label>
                        <button
                          type="button"
                          className={primaryButton}
                          disabled={pending || (draftBoss && bossItems.length > 0 ? !draftItem : !draftCustom.trim())}
                          onClick={() => saveTile(index + 1)}
                        >
                          Save tile
                        </button>
                        <button type="button" className="text-sm text-muted underline" onClick={() => setEditing(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-28 flex-1 flex-col items-center justify-center gap-1 text-center">
                      {info?.icon ? (
                        <img src={`/items/${info.icon}.png`} alt="" width={60} height={60} className="h-14 w-auto [image-rendering:pixelated]" loading="lazy" />
                      ) : (
                        <span className="grid h-14 w-14 place-items-center rounded-md border border-dashed border-surface-border text-muted" aria-hidden>
                          ?
                        </span>
                      )}
                      {info?.boss && <span className="text-xs text-muted">{info.boss}</span>}
                      <span className="line-clamp-3 break-words font-medium">{info?.boss ? info.item : (o?.label ?? key)}</span>
                    </div>
                  )}
                  {!isEditing && (
                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted">
                      <span className="tabular-nums">{o?.points ?? 0} pts</span>
                      {!editable && done > 0 ? <span>{done} done</span> : null}
                    </div>
                  )}
                </div>
              );
  };
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
        <button
          type="button"
          className="text-xs text-muted underline disabled:opacity-50"
          disabled={refreshing || pending}
          title="Ask the bot for the latest. This page also refreshes itself every few seconds."
          onClick={async () => {
            setRefreshing(true);
            try {
              await reload(true);
            } finally {
              setRefreshing(false);
            }
          }}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        {refreshedAt && <span className="text-xs text-muted">Updated {refreshedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
        <span className="ml-auto flex flex-wrap gap-2">{detail.nextStages.map(stageButton)}</span>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-surface-border">
        {TABS.filter((t) => (t.key !== "board" || e.template === "bingo") && (t.key !== "teams" || e.scoringMode === "TEAM")).map((t) => (
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
          {e.status !== "CANCELLED" && (
            <div className="space-y-3 rounded-xl border border-surface-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Before it starts</p>
                {detail.prep.ready ? <StatusBadge tone="good">Ready to start</StatusBadge> : e.status === "DRAFT" || e.status === "SIGNUPS" ? <StatusBadge tone="warn">Not ready yet</StatusBadge> : null}
              </div>
              <ol className="space-y-3">
                {detail.prep.steps.map((s) => (
                  <li key={s.key} className="flex gap-3">
                    <span
                      aria-hidden
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${s.state === "DONE" ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300" : s.state === "ACTIVE" ? "border-gold bg-gold/15 text-gold" : "border-surface-border text-muted"}`}
                    >
                      {s.state === "DONE" ? "✓" : s.state === "SKIPPED" ? "–" : "•"}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium">
                        {s.label}
                        {!s.required && <span className="ml-2 text-xs font-normal text-muted">optional for this event</span>}
                      </p>
                      <p className="text-xs text-muted">{s.detail}</p>
                      {s.key === "signups" && detail.setup.signupsClosedAt && (
                        <p className="text-xs text-muted">
                          Closed {formatUtc(detail.setup.signupsClosedAt)}
                          {detail.setup.signupsClosedBy ? ` by ${detail.setup.signupsClosedBy}` : ""}.
                        </p>
                      )}
                      {s.key === "roster" && detail.setup.rosterConfirmedAt && (
                        <p className="text-xs text-muted">
                          Confirmed {formatUtc(detail.setup.rosterConfirmedAt)}
                          {detail.setup.rosterConfirmedBy ? ` by ${detail.setup.rosterConfirmedBy}` : ""}.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {s.key === "signups" && e.status === "SIGNUPS" && !detail.setup.signupsClosedAt && (
                          <button
                            type="button"
                            className={primaryButton}
                            disabled={pending}
                            onClick={async () =>
                              (await confirmDialog({ title: "Close signups?", body: "Players can no longer join themselves, the Discord signup is paused, and the roster is synced one last time. Staff can still add late entries.", confirmLabel: "Close signups" })) &&
                              run("POST", `${base}/signup/close`, {}, "Signups are closed. The roster was synced one last time: check it, then confirm it.")
                            }
                          >
                            Close signups
                          </button>
                        )}
                        {s.key === "signups" && e.status === "SIGNUPS" && detail.setup.signupsClosedAt && (
                          <button
                            type="button"
                            className={ghostButton}
                            disabled={pending}
                            onClick={async () => (await confirmDialog({ title: "Reopen signups?", body: "Players can join again, and the roster has to be confirmed again once you close them.", confirmLabel: "Reopen signups" })) && run("POST", `${base}/signup/reopen`, {}, "Signups are open again.")}
                          >
                            Reopen signups
                          </button>
                        )}
                        {s.key === "roster" && e.status === "SIGNUPS" && detail.setup.signupsClosedAt && !detail.setup.rosterConfirmedAt && (
                          <>
                            <button type="button" className={primaryButton} disabled={pending} onClick={() => run("POST", `${base}/roster/confirm`, {}, "The roster is confirmed.")}>
                              Confirm the roster
                            </button>
                            <button type="button" className="text-sm text-gold underline" onClick={() => setTab("players")}>
                              Check the list first
                            </button>
                          </>
                        )}
                        {s.key === "verification" && s.state !== "DONE" && (
                          <button type="button" className="text-sm text-gold underline" onClick={() => setTab("players")}>
                            Decide on the Teams and players tab
                          </button>
                        )}
                        {s.key === "space" && s.state !== "WAITING" && s.state !== "SKIPPED" && (
                          <button type="button" className={s.state === "ACTIVE" ? primaryButton : "text-sm text-gold underline"} onClick={() => setTab("channels")}>
                            {s.state === "ACTIVE" ? "Set up the roles and channels" : "Open the Channels tab"}
                          </button>
                        )}
                        {s.key === "teams" && (s.state === "ACTIVE" || s.state === "DONE") && e.status !== "RUNNING" && e.status !== "SCORING" && e.status !== "DONE" && (
                          <button type="button" className={s.state === "ACTIVE" ? primaryButton : "text-sm text-gold underline"} onClick={() => setTab("teams")}>
                            {s.state === "ACTIVE" ? "Build the teams" : "Open the team builder"}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              {detail.prep.warnings.map((w) => (
                <p key={w} className="text-xs text-gold">
                  {w}
                </p>
              ))}
              {!detail.prep.ready && (e.status === "DRAFT" || e.status === "SIGNUPS") && <p className="text-xs text-muted">It can&apos;t start yet: {detail.prep.blockers.join(" ")}</p>}
            </div>
          )}
          <div className="space-y-3 rounded-xl border border-surface-border p-4">
            <p className="font-medium">Setup and verification</p>
            {editable ? (
              <>
                <EventSetupFields value={setupDraft} onChange={setSetupDraft} disabled={pending} />
                <button
                  type="button"
                  className={primaryButton}
                  disabled={pending || JSON.stringify(setupDraft) === JSON.stringify(setupFromConfig(e.config))}
                  onClick={() => run("PUT", base, { config: setupToConfig({ ...e.config }, setupDraft) }, "Setup saved.")}
                >
                  Save
                </button>
              </>
            ) : (
              <p className="text-sm text-muted">
                {(e.config.setup?.mode ?? "OFF") === "OFF" ? "This event doesn't follow the setup steps." : "This event follows the setup steps."}{" "}
                {e.config.verification?.required ? `Players must be verified ${GATES.find((g) => g.id === (e.config.verification?.gate ?? "TEAMS"))?.label.toLowerCase()}.` : "Players aren't asked to verify."}
              </p>
            )}
          </div>
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
                <button type="button" className={ghostButton} disabled={pending} onClick={() =>
                  run("POST", `${base}/signup/sync`, {}, (data) => {
                    const r = data as { synced?: number; removed?: number };
                    const added = r.synced ?? 0;
                    const removed = r.removed ?? 0;
                    return added === 0 && removed === 0 ? "The roster and the signup already match." : `Synced with the signup: ${added} added, ${removed} taken off.`;
                  })
                }>
                  Sync with the signup
                </button>
              )}
            </div>
            <p className="text-xs text-muted">The bot keeps the roster and the Discord signup the same, both ways, about every half minute: sign up or leave there or here and the other follows. Players staff added by hand aren&apos;t on the signup, so changes there don&apos;t touch them.</p>
          </div>
          <div className="space-y-2 rounded-xl border border-surface-border p-4">
            <p className="font-medium">Organisers</p>
            <p className="text-xs text-muted">
              Organisers can start and finish this event and approve or deny proof from Discord, without being staff or using the dashboard. Staff can always do all of that for every event.
            </p>
            {detail.organisers.length === 0 ? (
              <p className="text-muted">Nobody has been named for this event.</p>
            ) : (
              <ul className="divide-y divide-surface-border">
                {detail.organisers.map((o) => (
                  <li key={o.userId} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate">{o.userName ?? `Player ${o.userId}`}</span>
                    {e.status !== "DONE" && e.status !== "CANCELLED" && (
                      <button type="button" className="text-xs text-red-400 underline" disabled={pending} onClick={() => run("POST", `${base}/organisers`, { remove: [o.userId] }, `${o.userName ?? "They"} is no longer an organiser.`)}>
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {e.status !== "DONE" && e.status !== "CANCELLED" && (
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-0 flex-1 text-xs text-muted">
                  Add an organiser
                  <input
                    className={`${inputClass} mt-1`}
                    placeholder="A linked RuneScape name or a Discord user id"
                    list={`organiser-choices-${id}`}
                    value={organiser}
                    onChange={(ev) => setOrganiser(ev.target.value)}
                  />
                  <datalist id={`organiser-choices-${id}`}>
                    {active.map((p) => (
                      <option key={p.userId} value={p.userId} label={p.userName ?? undefined} />
                    ))}
                  </datalist>
                </label>
                <button
                  type="button"
                  className={ghostButton}
                  disabled={pending || !organiser.trim()}
                  onClick={() => run("POST", `${base}/organisers`, { add: [organiser.trim()] }, "Organiser added.", () => setOrganiser(""))}
                >
                  Add
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2 rounded-xl border border-surface-border p-4">
            <p className="font-medium">Save as a template</p>
            <p className="text-xs text-muted">
              Keep this event&apos;s settings, channels and prizes under a name, to make similar events from the event list in one step. Players, progress, board tiles and dates are not kept.
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="text-xs text-muted">
                Template name
                <input className={`${inputClass} mt-1`} value={tplName} maxLength={60} onChange={(ev) => setTplName(ev.target.value)} />
              </label>
              <label className="text-xs text-muted">
                Note (optional)
                <input className={`${inputClass} mt-1`} value={tplNote} maxLength={300} onChange={(ev) => setTplNote(ev.target.value)} />
              </label>
              <button
                type="button"
                className={ghostButton}
                disabled={pending || tplName.trim().length < 3}
                onClick={() => run("POST", "events/saved-templates", { eventId: id, name: tplName.trim(), description: tplNote.trim() }, "Saved as a template. Find it under Your templates on the event list.")}
              >
                Save as a template
              </button>
            </div>
          </div>
          <p className="text-muted">
            {editable ? "Objectives, teams and prizes can be changed until the event starts." : "The event has started, so its setup is locked. Progress, proof and payouts still work."}
          </p>
        </section>
      )}

      {tab === "board" && e.template === "bingo" && e.config.board && (
        <section className="space-y-4">
          <p className="text-sm text-muted">
            {layout ? `A ${layout.name} board of ${layout.tiles} tiles.` : `A ${e.config.board.size} × ${e.config.board.size} board.`} Lock the tiles you like, then re-roll to change the rest, or press Edit on a tile to pick its boss and item (or type your own tile). Tiles are ordinary objectives, so you can also rename them on the Objectives tab.
          </p>
          {layout ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-surface-border bg-surface p-3 text-sm">
                <p className="font-medium">{layout.name}</p>
                <p className="mt-1 text-xs text-muted">{layout.rule}</p>
                <p className="mt-1 text-xs text-muted">
                  {layout.unlock === "locked"
                    ? "Tiles open in order: a closed tile can't be completed until the tiles it needs are done (shown under each tile)."
                    : "Tiles can be done in any order; the shape only earns its tier, row or ring bonuses."}
                </p>
              </div>
              {layout.rows.map((row, r) => (
                <div key={r}>
                  <p className="mb-2 text-center text-[11px] font-semibold tracking-wider text-muted/80 uppercase">{layout.rowNames[r]}</p>
                  <div className="flex flex-wrap items-start justify-center gap-3">
                    {row.map((n) => {
                      const key = e.config.board?.keys[n - 1];
                      const needs = layout.unlock === "locked" ? layout.requires[String(n)] : undefined;
                      if (!key) return null;
                      return (
                        <div key={n} className={editing === key ? "w-full sm:w-96" : "w-44"}>
                          {renderTile(key, n - 1)}
                          {needs && needs.length > 0 && <p className="mt-1 text-center text-[11px] text-muted">Needs {needs.map((x) => `#${x}`).join(", ")}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid max-w-5xl gap-3" style={{ gridTemplateColumns: `repeat(${e.config.board.size}, minmax(0, 1fr))` }}>
              {e.config.board.keys.map((key, index) => renderTile(key, index))}
            </div>
          )}
          {editable ? (
            <div className="flex flex-wrap items-end gap-2">
              <button type="button" className={primaryButton} disabled={pending} onClick={() => run("POST", `${base}/bingo`, { lockedKeys: locked }, locked.length ? "Re-rolled. Locked tiles stayed." : "Re-rolled the board.")}>
                Re-roll{locked.length ? ` (keep ${locked.length} locked)` : ""}
              </button>
              {!layout && (
              <>
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
                onClick={async () => (await confirmDialog({ title: "Change the size?", body: "That makes a fresh board and drops locks.", confirmLabel: "Change size", tone: "danger" })) && run("POST", `${base}/bingo`, { size: Number(newSize) }, "New board made.", () => { setNewSize(""); setLocked([]); })}
              >
                Change size
              </button>
              </>
              )}
              <select className={`${inputClass} max-w-56`} value={newShape} onChange={(ev) => setNewShape(ev.target.value)} aria-label="Board shape">
                <option value="">Change shape…</option>
                {[["grid", "Square grid"], ["path", "The Adventurer's Path"], ["pyramid", "Pyramid of the Pharaohs"], ["convergence", "The Boss Convergence"], ["tree", "The World Tree"]]
                  .filter(([id]) => id !== (layout?.id ?? "grid"))
                  .map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className={ghostButton}
                disabled={pending || !newShape}
                onClick={async () =>
                  (await confirmDialog({ title: "Change the shape?", body: "That makes a fresh board and drops locks.", confirmLabel: "Change shape", tone: "danger" })) &&
                  run("POST", `${base}/bingo`, newShape === "grid" ? { layout: "grid", size: 5 } : { layout: newShape }, "New board made.", () => { setNewShape(""); setLocked([]); })
                }
              >
                Change shape
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
          {e.status !== "DONE" && e.status !== "CANCELLED" && (
            <div className="space-y-3 rounded-xl border border-surface-border p-4">
              <div>
                <p className="text-sm font-medium">Look</p>
                <p className="text-xs text-muted">
                  What the board picture in Discord is drawn on. Only the picture changes, never the tiles or the rules, so it can be changed any time before the event is over
                  {currentLook ? "" : ` (this board is still drawn the original way: ${layout ? "in the template picture" : "as the plain dark board"})`}.
                </p>
              </div>
              <BingoLookPicker shape={layout?.id ?? "grid"} value={pickedLook ?? currentLook ?? (layout ? "classic" : "plain")} onChange={setPickedLook} allowPlain={!layout} disabled={pending} />
              <button
                type="button"
                className={primaryButton}
                disabled={pending || !pickedLook || pickedLook === (currentLook ?? (layout ? "classic" : "plain"))}
                onClick={() => pickedLook && run("POST", `${base}/look`, { look: pickedLook === PLAIN_LOOK.id ? "" : pickedLook }, `The board is now drawn in the ${[...BINGO_LOOKS, PLAIN_LOOK].find((x) => x.id === pickedLook)?.label ?? ""} look.`, () => setPickedLook(null))}
              >
                Use this look
              </button>
            </div>
          )}
          {structure && (
            <div className="space-y-3 rounded-xl border border-surface-border p-4">
              <p className="text-sm font-medium">Discord</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted">Live board channel</p>
                  <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={boardChannel} onChange={setBoardChannel} none="No live board" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted">Screenshot review channel</p>
                  <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={reviewChannel} onChange={setReviewChannel} none="No review channel" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={ghostButton}
                  disabled={pending}
                  onClick={() => run("PUT", base, { config: channelConfig() }, "Channels saved.")}
                >
                  Save channels
                </button>
                <button
                  type="button"
                  className={primaryButton}
                  disabled={pending || !boardChannel || (e.status !== "RUNNING" && e.status !== "SCORING" && e.status !== "DONE")}
                  title="Posts the board picture, or updates it if it is already there"
                  onClick={() => {
                    setProblem(null);
                    setNote(null);
                    start(async () => {
                      if (channelsChanged) {
                        const saved = await call("PUT", base, { config: channelConfig() });
                        if (!saved.ok) return setProblem({ title: `The channels couldn't be saved: ${saved.error}`, items: saved.problems });
                        await refresh();
                      }
                      const result = await call("POST", `${base}/board`, {});
                      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
                      setNote((result.data as { message?: string } | null)?.message ?? "Done.");
                    });
                  }}
                >
                  Post or refresh the board
                </button>
              </div>
              {channelsChanged && (
                <p className="text-xs text-amber-300">
                  These channel choices aren&apos;t saved yet. Press Save channels, or just start the event or post the board: either saves them first.
                </p>
              )}
              <p className="text-xs text-muted">The board posts itself when the event starts and updates a few seconds after each approval. Players send screenshots with /events submit.</p>
            </div>
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

      {tab === "teams" && e.scoringMode === "TEAM" && <TeamBuilder detail={detail} call={call} onDetail={setDetail} />}

      {tab === "channels" && <ChannelsTab detail={detail} call={call} structure={structure} onDetail={setDetail} />}
      {tab === "wrapup" && <WrapupTab detail={detail} call={call} />}

      {tab === "players" && (
        <section className="space-y-5">
          <div className="space-y-2">
            <h3 className="font-semibold">Teams</h3>
            {e.scoringMode === "TEAM" && (
              <p className="text-sm text-muted">
                Teams are built on the{" "}
                <button type="button" className="text-gold underline" onClick={() => setTab("teams")}>
                  Team builder
                </button>{" "}
                tab. Each player&apos;s team can still be changed from the list below.
              </p>
            )}
            {e.scoringMode !== "TEAM" && (
              <>
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
              </>
            )}
          </div>

          {detail.refused.length > 0 && (
            <div className="space-y-2 rounded-xl border border-gold/40 p-4">
              <h3 className="font-semibold">Signups that were turned away</h3>
              <ul className="divide-y divide-surface-border text-sm">
                {detail.refused.map((r) => (
                  <li key={r.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium">{r.userName ?? `Player ${r.userId}`}</span>
                      <span className="ml-2 text-muted">{r.reason}</span>
                    </span>
                    <button type="button" className="text-xs text-gold underline" onClick={() => setAddUser(r.userId)}>
                      Use their ID below
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">They were told why. To let one in anyway, add them below and choose the kind of player; that overrides the rule that turned them away.</p>
            </div>
          )}

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

          {detail.verification.required && (
            <div className="space-y-1 rounded-xl border border-surface-border p-4 text-sm">
              <p className="font-medium">Verification</p>
              <p className="text-muted">
                {detail.verification.verified} verified
                {detail.verification.waived > 0 ? `, ${detail.verification.waived} let through` : ""}, {detail.verification.pending} waiting for a decision, {detail.verification.rejected} turned down. Players must pass{" "}
                {GATES.find((g) => g.id === detail.verification.gate)?.label.toLowerCase()}.
              </p>
              {detail.verification.instructions && <p className="text-xs text-muted">Players were told: {detail.verification.instructions}</p>}
            </div>
          )}

          <ul className="divide-y divide-surface-border">
            {detail.participants.length === 0 && <li className="py-3 text-sm text-muted">Nobody has joined yet.</li>}
            {detail.participants.map((p) => (
              <li key={p.userId} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{p.userName ?? `Player ${p.userId}`}</span> <span className="text-xs text-muted">{KIND_LABEL[p.kind]}</span>
                  <span className="ml-2 text-xs text-muted" title="Players from the signup follow it: take them off the signup in Discord and they come off here too.">
                    {p.source === "STAFF" ? "added by staff" : "on the signup"}
                  </span>
                  {p.waiting && <span className="ml-2"><StatusBadge tone="warn">Waiting</StatusBadge></span>}
                </span>
                {detail.verification.required && !p.waiting && (
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={p.verification === "VERIFIED" || p.verification === "WAIVED" ? "good" : "warn"}>
                      {{ VERIFIED: "Verified", WAIVED: "Waived", PENDING: "Needs verification", REJECTED: "Turned down", NOT_REQUIRED: "Not required" }[p.verification]}
                    </StatusBadge>
                    {p.verification !== "VERIFIED" && (
                      <button type="button" className="text-xs text-gold underline" disabled={pending} onClick={() => run("PUT", `${base}/participants/${p.userId}/verification`, { state: "verified" }, `${nameOf(p.userId)} is verified.`)}>
                        Verify
                      </button>
                    )}
                    {p.verification !== "VERIFIED" && p.verification !== "WAIVED" && (
                      <button type="button" className="text-xs text-gold underline" disabled={pending} title="Let them through without proof" onClick={() => run("PUT", `${base}/participants/${p.userId}/verification`, { state: "waived" }, `${nameOf(p.userId)} was let through without proof.`)}>
                        Waive
                      </button>
                    )}
                    {p.verification !== "REJECTED" && (
                      <button
                        type="button"
                        className="text-xs text-red-400 underline"
                        disabled={pending}
                        onClick={async () => {
                          const answers = await askDialog({ title: `Turn down ${nameOf(p.userId)}'s verification?`, body: "They will see the reason, so they can fix it.", confirmLabel: "Turn down", tone: "danger", fields: [{ key: "why", type: "textarea", label: "Why", required: true, maxLength: 300 }] });
                          const why = answers ? String(answers.why) : "";
                          if (why.trim()) run("PUT", `${base}/participants/${p.userId}/verification`, { state: "rejected", note: why.trim() }, `${nameOf(p.userId)}'s verification was turned down.`);
                        }}
                      >
                        Turn down
                      </button>
                    )}
                    {p.verification !== "PENDING" && (
                      <button type="button" className="text-xs text-muted underline" disabled={pending} onClick={() => run("PUT", `${base}/participants/${p.userId}/verification`, { state: "pending" }, `${nameOf(p.userId)} is waiting for a decision again.`)}>
                        Reset
                      </button>
                    )}
                    {p.verification === "REJECTED" && p.verificationNote && <span className="basis-full text-xs text-muted">Reason: {p.verificationNote}</span>}
                  </span>
                )}
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
                    {p.buyIn === "PAID" && <button type="button" className="text-xs text-gold underline" onClick={async () => (await confirmDialog({ title: "Mark this buy-in as refunded?", confirmLabel: "Mark refunded" })) && run("PUT", `${base}/participants/${p.userId}/buyin`, { status: "refunded" }, "Buy-in marked refunded.")}>Refund</button>}
                  </span>
                )}
                <button type="button" className="text-xs text-red-400 underline" onClick={async () => {
                  const answers = await askDialog({
                    title: `Remove ${nameOf(p.userId)} from the event?`,
                    body: "They leave the roster and their team, and come off the Discord signup.",
                    confirmLabel: "Remove player",
                    tone: "danger",
                    fields: [
                      { key: "ban", type: "checkbox", label: "Also bar them from this event", hint: "They can't sign up again, in Discord or here, and staff can't add them until you lift it." },
                      { key: "reason", type: "textarea", label: "Reason", placeholder: "Shown to staff, and to them if they try to come back.", required: true, maxLength: 300, showWhen: "ban" },
                    ],
                  });
                  if (!answers) return;
                  if (answers.ban === true) run("POST", `${base}/bans`, { userId: p.userId, reason: String(answers.reason) }, `${nameOf(p.userId)} was removed and barred from the event.`);
                  else run("DELETE", `${base}/participants/${p.userId}`, undefined, "Player removed.");
                }}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {detail.bans.length > 0 && (
            <div className="mt-4 space-y-2 rounded-xl border border-surface-border p-4 text-sm">
              <p className="font-medium">Barred from this event</p>
              <ul className="divide-y divide-surface-border/60">
                {detail.bans.map((b) => (
                  <li key={b.userId} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="font-medium">{b.userName ?? `Player ${b.userId}`}</span>
                      <span className="block text-xs text-muted">
                        {b.reason}
                        {b.bannedBy ? ` · by ${b.bannedBy}` : ""} · {formatUtc(b.at)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="text-xs text-gold underline"
                      disabled={pending}
                      onClick={async () => (await confirmDialog({ title: `Let ${b.userName ?? `player ${b.userId}`} take part again?`, body: "They aren't put back on the roster: they sign up again like anyone.", confirmLabel: "Lift the ban" })) && run("DELETE", `${base}/bans/${b.userId}`, undefined, "The ban was lifted.")}
                    >
                      Lift the ban
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
                      {c.kind === "VERIFICATION" ? (
                        <>
                          <span className="font-medium">{c.userName ?? nameOf(c.userId)}</span> sent proof for <span className="font-medium">verification</span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{c.userName ?? nameOf(c.userId)}</span> on <span className="font-medium">{detail.objectives.find((o) => o.key === c.objective)?.label ?? c.objective}</span> (×{c.amount})
                        </>
                      )}
                    </p>
                    {c.note && <p className="break-words text-muted">{c.note}</p>}
                    {c.proofUrl && /^https?:\/\//i.test(c.proofUrl) && (
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
                      <span>{c.userName ?? nameOf(c.userId)} · {c.kind === "VERIFICATION" ? "Verification" : (detail.objectives.find((o) => o.key === c.objective)?.label ?? c.objective)}</span>
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
          <PrizeListEditor prizes={prizes} onChange={setPrizes} lockPlaces={!detail.editable && awards.length > 0} />
          <div className="flex flex-wrap gap-2">
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
                      {(a.status === "PENDING" || a.status === "PAID") && <button type="button" className="text-xs text-red-400 underline" onClick={async () => (await confirmDialog({ title: "Revoke this prize?", confirmLabel: "Revoke", tone: "danger" })) && run("POST", `${base}/awards/${a.id}/status`, { status: "revoked" }, "Revoked.")}>Revoke</button>}
                      {a.status === "PAID" && <button type="button" className="text-xs text-red-400 underline" onClick={async () => (await confirmDialog({ title: "Refund this prize?", confirmLabel: "Refund", tone: "danger" })) && run("POST", `${base}/awards/${a.id}/status`, { status: "refunded" }, "Refunded.")}>Refund</button>}
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
