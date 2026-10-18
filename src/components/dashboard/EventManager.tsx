"use client";

/* eslint-disable @next/next/no-img-element -- 30px pixel-art item icons from /public/items; next/image would only blur them */

import { confirmDialog } from "@/components/ui/Dialogs";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { dangerButton, formatUtc, ghostButton, inputClass, Notice, primaryButton, StatusBadge } from "@/components/admin/ui";
import { STAGE_LABEL, type EventCall } from "@/components/dashboard/EventListView";
import { BingoLookPicker } from "@/components/dashboard/BingoLookPicker";
import { EventSetupFields, GATES, setupFromConfig, setupToConfig, type SetupDraft } from "@/components/dashboard/EventSetupFields";
import { EventDashboard } from "@/components/dashboard/events/EventDashboard";
import { ObjectivesTab } from "@/components/dashboard/events/ObjectivesTab";
import { PlayersTab } from "@/components/dashboard/events/PlayersTab";
import { ProgressTab } from "@/components/dashboard/events/ProgressTab";
import { PrizeListEditor } from "@/components/dashboard/setup/PrizeListEditor";
import { BoardChannelsPanel } from "@/components/dashboard/space/BoardChannelsPanel";
import { ChannelsTab } from "@/components/dashboard/space/ChannelsTab";
import { WrapupTab } from "@/components/dashboard/space/WrapupTab";
import { TeamBuilder } from "@/components/dashboard/teams/TeamBuilder";
import { ActionMenu } from "@/components/dashboard/ui/ActionMenu";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { BINGO_LOOKS, PLAIN_LOOK, type EventAward, type EventClaims, type EventDetail, type EventObjective, type EventPrize, type EventStandings, type EventStatus, type BingoCatalog } from "@/lib/eventTypes";
import type { GuildStructure } from "@/lib/jonnybot-admin";

type Tab = "overview" | "board" | "objectives" | "teams" | "channels" | "players" | "progress" | "standings" | "prizes" | "wrapup";
/** In the order the work is done; `group` is where a thin divider goes: the overview, then setting it up, then running it. */
const TABS: { key: Tab; label: string; group: number }[] = [
  { key: "overview", label: "Overview", group: 0 },
  { key: "board", label: "Board", group: 1 },
  { key: "objectives", label: "Objectives", group: 1 },
  { key: "players", label: "Players", group: 1 },
  { key: "teams", label: "Team builder", group: 1 },
  { key: "channels", label: "Channels", group: 1 },
  { key: "progress", label: "Progress and proof", group: 2 },
  { key: "standings", label: "Standings", group: 2 },
  { key: "prizes", label: "Prizes and payouts", group: 2 },
  { key: "wrapup", label: "Wrap-up", group: 2 },
];

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
  const [viewMode] = useViewMode();
  const tabBar = useRef<HTMLDivElement>(null);
  const id = detail.event.id;
  const base = `events/${id}`;

  // on a narrow screen the tabs scroll sideways: keep the one in use in view
  useEffect(() => {
    const list = tabBar.current;
    const active = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !active) return;
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    if (left < list.scrollLeft) list.scrollTo({ left: left - 8, behavior: "smooth" });
    else if (right > list.scrollLeft + list.clientWidth) list.scrollTo({ left: right - list.clientWidth + 8, behavior: "smooth" });
  }, [tab]);

  /** Changing tab leaves the last tab's message behind: an error from one tab doesn't follow you around (or show up twice when the next tab fails the same way). */
  function setTab(next: Tab) {
    setProblem(null);
    setNote(null);
    setTabNow(next);
  }

  const [objs, setObjs] = useState<EventObjective[]>(initial.objectives);
  const [prizes, setPrizes] = useState<EventPrize[]>(initial.prizes);
  const [locked, setLocked] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<BingoCatalog | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftBoss, setDraftBoss] = useState("");
  const [draftItem, setDraftItem] = useState("");
  const [draftCustom, setDraftCustom] = useState("");
  const [draftPoints, setDraftPoints] = useState("25");
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

  function run(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body: unknown, message: string | ((data: unknown) => string), after?: () => void) {
    setProblem(null);
    setNote(null);
    start(async () => {
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
      disabled={pending || (to === "RUNNING" && !detail.prep.ready)}
      title={to === "RUNNING" && !detail.prep.ready ? `Can't start yet: ${detail.prep.blockers.join(" ")}` : undefined}
      onClick={async () => {
        if (to === "CANCELLED" && !(await confirmDialog({ title: "Cancel this event?", body: "It can't be reopened.", confirmLabel: "Cancel event", tone: "danger" }))) return;
        if (to === "RUNNING" && !(await confirmDialog({ title: "Start the event?", body: "Players can start scoring, and the objectives, teams and prizes are locked once it is running.", confirmLabel: "Start the event" }))) return;
        run("POST", `${base}/status`, { status: to.toLowerCase() }, `The event is now ${STAGE_LABEL[to].toLowerCase()}.`);
      }}
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
                      <span className="flex gap-2">
                        <button type="button" aria-pressed={isLocked} className={`rounded border px-2 py-1 transition ${isLocked ? "border-gold bg-gold/10 text-gold" : "border-control-border hover:border-gold hover:text-foreground"}`} title="Locked tiles stay put when you re-roll" onClick={() => setLocked(isLocked ? locked.filter((k) => k !== key) : [...locked, key])}>
                          {isLocked ? "Locked" : "Lock"}
                        </button>
                        <button type="button" className="rounded border border-control-border px-2 py-1 text-gold transition hover:border-gold" onClick={() => editTile(key)}>
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
  const stepNow = (key: string) => detail.prep.steps.some((s) => s.key === key && s.state === "ACTIVE" && s.required);
  const early = e.status === "DRAFT" || e.status === "SIGNUPS";
  const finished = e.status === "DONE" || e.status === "CANCELLED";
  /** Tabs with something waiting for a person get a dot; tabs with nothing to show yet are dimmed (and still open) with the reason on hover. */
  const wants: Partial<Record<Tab, string>> = {};
  if (early && stepNow("space")) wants.channels = "The roles and channels still need setting up";
  if (early && stepNow("teams")) wants.teams = "The teams still need building";
  if (early && (stepNow("roster") || stepNow("verification"))) wants.players = "The roster or verification needs a decision";
  if (claims.pending.length > 0) wants.progress = `${claims.pending.length} proof waiting for a decision`;
  const notYet: Partial<Record<Tab, string>> = {};
  if (early) {
    notYet.progress = "Nothing to review until the event is running";
    notYet.standings = "Standings start once the event is running";
  }
  if (!finished && e.status !== "SCORING") notYet.wrapup = "Opens up once the event is over";

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
        {detail.nextStages.includes("RUNNING") && !detail.prep.ready && detail.prep.blockers.length > 0 && (
          <p className="basis-full text-xs text-muted">
            Can&apos;t start yet: {detail.prep.blockers.join(" ")}{" "}
            <button type="button" className="text-gold underline" onClick={() => setTab("overview")}>
              See the checklist
            </button>
          </p>
        )}
      </div>

      <div ref={tabBar} role="tablist" aria-label="This event" className="sticky top-0 z-20 -mx-1 flex items-stretch gap-1 overflow-x-auto border-b border-surface-border bg-background/95 px-1 backdrop-blur">
        {TABS.filter((t) => (t.key !== "board" || e.template === "bingo") && (t.key !== "teams" || e.scoringMode === "TEAM")).map((t, i, shown) => (
          <Fragment key={t.key}>
            {i > 0 && shown[i - 1].group !== t.group && <span aria-hidden className="mx-1 my-2 w-px shrink-0 bg-surface-border" />}
            <button
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              title={wants[t.key] ?? notYet[t.key]}
              className={`shrink-0 px-3 py-2.5 text-sm whitespace-nowrap transition ${tab === t.key ? "border-b-2 border-gold text-gold" : `text-muted hover:text-foreground ${notYet[t.key] && !wants[t.key] ? "opacity-70" : ""}`}`}
            >
              {t.label}
              {t.key === "progress" && claims.pending.length > 0 ? ` (${claims.pending.length})` : ""}
              {wants[t.key] && t.key !== "progress" && <span aria-label="needs attention" className="ml-1.5 inline-block size-1.5 rounded-full bg-gold align-middle" />}
            </button>
          </Fragment>
        ))}
      </div>

      {tab === "overview" && (
        <section className="space-y-4 text-sm">
          <EventDashboard detail={detail} proofWaiting={claims.pending.length} onOpen={setTab} />
          <PanelGrid min="28rem">
          {e.status !== "CANCELLED" && (
            <div id="event-prep" className="scroll-mt-4">
            <CollapsibleCard
              id="event-prep"
              title="Before it starts"
              hint="What is left before this event can start, and the buttons for each step."
              defaultOpen
              summary={detail.prep.ready ? <Chip tone="good">Ready to start</Chip> : e.status === "DRAFT" || e.status === "SIGNUPS" ? <Chip tone="warn">Not ready yet</Chip> : null}
            >
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
                        {s.key === "roster" && e.status === "SIGNUPS" && detail.setup.signupsClosedAt && (!detail.setup.rosterConfirmedAt || s.state === "ACTIVE") && (
                          <>
                            <button type="button" className={primaryButton} disabled={pending} onClick={() => run("POST", `${base}/roster/confirm`, {}, "The roster is confirmed.")}>
                              {detail.setup.rosterConfirmedAt ? "Confirm the roster again" : "Confirm the roster"}
                            </button>
                            <button type="button" className="text-sm text-gold underline" onClick={() => setTab("players")}>
                              Check the list first
                            </button>
                          </>
                        )}
                        {s.key === "verification" && s.state !== "DONE" && (
                          <button type="button" className="text-sm text-gold underline" onClick={() => setTab("players")}>
                            Decide on the Players tab
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
            </CollapsibleCard>
            </div>
          )}
          <div className="space-y-4">
          <CollapsibleCard
            id="event-details"
            title="Details"
            hint="What the event is about and who can join."
            summary={<Chip>{e.scope === "PRIVATE" ? "Clan only" : e.scope === "ALLIANCE" ? "Clan and allies" : "Everyone"}</Chip>}
          >
          {e.description && <p className="break-words whitespace-pre-wrap">{e.description}</p>}
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt className="text-xs text-muted">Created</dt><dd>{formatUtc(e.createdAt)}</dd></div>
            <div><dt className="text-xs text-muted">Signups close</dt><dd>{e.config.signupClosesAt ? formatUtc(e.config.signupClosesAt) : "No deadline"}</dd></div>
            <div><dt className="text-xs text-muted">Who may join</dt><dd>{{ everyone: "Everyone, mixed freely", home: "Only this server", clanVsOutsiders: "Clan members apart from everyone else", separate: "Every kind on its own teams" }[e.config.teamPolicy ?? "everyone"] ?? e.config.teamPolicy}</dd></div>
            <div><dt className="text-xs text-muted">When full</dt><dd>{e.config.queue === "CLAN_FIRST" ? "Clan members first" : "First come, first served"}</dd></div>
            <div><dt className="text-xs text-muted">Buy-in</dt><dd>{e.config.buyIn?.enabled ? `${gp(e.config.buyIn.amount ?? 0)} per player` : "None"}</dd></div>
          </dl>
          </CollapsibleCard>
          <CollapsibleCard
            id="event-setup"
            title="Setup and verification"
            hint="Whether this event follows the setup steps, and whether players must be verified."
            summary={
              <>
                <Chip>{(e.config.setup?.mode ?? "OFF") === "OFF" ? "No setup steps" : "Follows the setup steps"}</Chip>
                <Chip tone={e.config.verification?.required ? "good" : "plain"}>{e.config.verification?.required ? "Verification on" : "No verification"}</Chip>
              </>
            }
          >
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
          </CollapsibleCard>
          <CollapsibleCard
            id="event-signup-panel"
            title="Signup panel"
            hint="The signup message in Discord."
            summary={
              <>
                <Chip tone={detail.signup.attached ? (detail.signup.active ? "good" : "plain") : "warn"}>{!detail.signup.attached ? "Not posted" : detail.signup.active ? "Open" : "Closed"}</Chip>
                {detail.signup.attached && <Chip>{detail.signup.entries} signed up</Chip>}
              </>
            }
          >
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
          </CollapsibleCard>
          <CollapsibleCard
            id="event-organisers"
            title="Organisers"
            hint="People who can run this one event from Discord."
            summary={<Chip>{detail.organisers.length === 0 ? "Nobody named" : `${detail.organisers.length} named`}</Chip>}
          >
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
          </CollapsibleCard>
          {viewMode === "advanced" && (
          <CollapsibleCard id="event-template" title="Save as a template" hint="Reuse this event's settings for the next one.">
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
          </CollapsibleCard>
          )}
          </div>
          </PanelGrid>
          <MoreInAdvanced>saving this event as a template.</MoreInAdvanced>
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
          <div className="space-y-2 rounded-xl border border-surface-border p-4">
            <p className="text-sm font-medium">Boards</p>
            <select
              className={inputClass}
              value={e.config.board?.display ?? "SHARED"}
              disabled={pending || e.status === "DONE" || e.status === "CANCELLED"}
              onChange={(ev) => run("PUT", base, { config: { ...e.config, board: { ...e.config.board, display: ev.target.value } } }, "Saved. Press Post or refresh the boards to update Discord now.")}
            >
              <option value="OWN">Each team or player has their own board</option>
              <option value="SHARED">One board for everyone</option>
              <option value="BOTH">Both: their own boards and the shared live board</option>
            </select>
            <p className="text-xs text-muted">
              Most events give every team or player a board of their own to work through: it is posted in their own channel and updates as their tiles are approved. The shared board shows how many teams or players have each tile.
            </p>
          </div>
          <BoardChannelsPanel detail={detail} call={call} structure={structure} onOpenChannels={() => setTab("channels")} />
          <div className="space-y-2">
            <button
              type="button"
              className={primaryButton}
              disabled={pending || (e.status !== "RUNNING" && e.status !== "SCORING" && e.status !== "DONE")}
              title="Posts the boards, or updates them where they are already"
              onClick={() => {
                setProblem(null);
                setNote(null);
                start(async () => {
                  const result = await call("POST", `${base}/board`, {});
                  if (!result.ok) return setProblem({ title: result.error, items: result.problems });
                  setNote((result.data as { message?: string } | null)?.message ?? "Done.");
                });
              }}
            >
              Post or refresh the boards
            </button>
            <p className="text-xs text-muted">The boards post themselves when the event starts and update a few seconds after each approval. Players send screenshots with /submit event in their channel.</p>
          </div>
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
        <ObjectivesTab
          objectives={objs}
          saved={detail.objectives}
          onChange={setObjs}
          editable={editable}
          pending={pending}
          onAdd={() => setObjs([...objs, emptyObjective()])}
          onSave={() => run("PUT", `${base}/objectives`, { objectives: objs.map((o) => ({ ...o })) }, "Objectives saved.")}
        />
      )}

      {tab === "teams" && e.scoringMode === "TEAM" && <TeamBuilder detail={detail} call={call} onDetail={setDetail} />}

      {tab === "channels" && <ChannelsTab detail={detail} call={call} structure={structure} onDetail={setDetail} />}
      {tab === "wrapup" && <WrapupTab detail={detail} call={call} />}

      {tab === "players" && <PlayersTab detail={detail} base={base} editable={editable} pending={pending} run={run} nameOf={nameOf} onOpenTeams={() => setTab("teams")} />}

      {tab === "progress" && <ProgressTab detail={detail} claims={claims} base={base} pending={pending} run={run} nameOf={nameOf} />}

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
          <SaveBar pending={pending} onSave={() => run("PUT", `${base}/prizes`, { prizes }, "Prizes saved.")} outcome={null} dirty={JSON.stringify(prizes) !== JSON.stringify(detail.prizes)} onDiscard={() => setPrizes(detail.prizes)} label="Save prizes" />

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
                      {a.status === "PENDING" && (
                        <button type="button" className="rounded-md border border-gold/60 px-3 py-2 text-sm font-medium text-gold transition hover:bg-gold/10 disabled:opacity-50" disabled={pending} onClick={() => run("POST", `${base}/awards/${a.id}/status`, { status: "paid" }, "Marked as paid.")}>
                          Mark paid
                        </button>
                      )}
                      {(a.status === "PENDING" || a.status === "PAID") && (
                        <ActionMenu
                          label={`More for ${a.userName ?? `player ${a.userId}`}'s prize`}
                          disabled={pending}
                          items={[
                            ...(a.status === "PAID"
                              ? [{ label: "Refund this prize…", tone: "danger" as const, onSelect: async () => (await confirmDialog({ title: "Refund this prize?", confirmLabel: "Refund", tone: "danger" })) && run("POST", `${base}/awards/${a.id}/status`, { status: "refunded" }, "Refunded.") }]
                              : []),
                            { label: "Revoke this prize…", tone: "danger" as const, onSelect: async () => (await confirmDialog({ title: "Revoke this prize?", confirmLabel: "Revoke", tone: "danger" })) && run("POST", `${base}/awards/${a.id}/status`, { status: "revoked" }, "Revoked.") },
                          ]}
                        />
                      )}
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
