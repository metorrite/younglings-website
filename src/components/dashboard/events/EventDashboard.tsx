"use client";

import { formatUtc, StatusBadge } from "@/components/admin/ui";
import { StatTile } from "@/components/dashboard/overview/StatTile";
import type { EventDetail, EventPrepStep } from "@/lib/eventTypes";

export type EventDashboardTab = "board" | "objectives" | "teams" | "channels" | "players" | "progress" | "prizes" | "wrapup";

const STAGE: Record<EventDetail["event"]["status"], string> = { DRAFT: "Draft", SIGNUPS: "Signups open", RUNNING: "Running", SCORING: "Scoring", DONE: "Done", CANCELLED: "Cancelled" };
const gp = (n: number) => n.toLocaleString("en-GB") + " gp";

/** Where each step of the checklist is dealt with: a tab, or the checklist itself (which has the buttons for closing signups and confirming the roster). */
const STEP_TAB: Partial<Record<string, EventDashboardTab>> = { roster: "players", verification: "players", space: "channels", teams: "teams" };

/** The step to point at: the one the checklist says is current, else the first one still ahead. */
function nextStep(steps: EventPrepStep[]): EventPrepStep | undefined {
  return steps.find((s) => s.state === "ACTIVE") ?? steps.find((s) => s.state === "WAITING" && s.required);
}

/**
 * A small dashboard for one event, at the top of its Overview: where it stands, how many people are in, what is waiting for a decision and what to do next.
 * It only reads what the page already has, and each tile opens the tab where the thing is dealt with.
 */
export function EventDashboard({ detail, proofWaiting, onOpen }: { detail: EventDetail; proofWaiting: number; onOpen: (tab: EventDashboardTab) => void }) {
  const e = detail.event;
  const players = detail.participants.filter((p) => !p.waiting).length;
  const waiting = detail.participants.length - players;
  const over = e.status === "DONE" || e.status === "CANCELLED";
  const steps = detail.prep.steps.filter((s) => s.state !== "SKIPPED");
  const stepsDone = steps.filter((s) => s.state === "DONE").length;
  const following = steps.length > 0 && (e.status === "DRAFT" || e.status === "SIGNUPS");
  const next = following ? nextStep(detail.prep.steps) : undefined;
  const teamEvent = e.scoringMode === "TEAM";

  let heading: string;
  let line: string;
  let action: { label: string; run: () => void } | null = null;
  if (e.status === "CANCELLED") {
    heading = "This event was cancelled";
    line = "Nothing more to do here.";
  } else if (e.status === "DONE") {
    heading = "This event is finished";
    line = "Check the prizes were paid, then tidy up on the Wrap-up tab.";
    action = { label: "Open the wrap-up", run: () => onOpen("wrapup") };
  } else if (e.status === "RUNNING" || e.status === "SCORING") {
    if (proofWaiting > 0) {
      heading = `${proofWaiting} ${proofWaiting === 1 ? "proof is" : "proofs are"} waiting for you`;
      line = "Players are waiting to hear if their proof counted.";
      action = { label: "Decide on the proof", run: () => onOpen("progress") };
    } else {
      heading = e.status === "RUNNING" ? "Running. Nothing needs you right now" : "Being scored. Nothing needs you right now";
      line = "New proof and progress show up here as they come in.";
    }
  } else if (next) {
    heading = next.label;
    line = next.detail;
    const tab = STEP_TAB[next.key];
    action = tab
      ? { label: next.key === "space" ? "Open the Channels tab" : next.key === "teams" ? "Open the team builder" : "Open the Players tab", run: () => onOpen(tab) }
      : { label: "Go to the checklist", run: () => document.getElementById("event-prep")?.scrollIntoView({ behavior: "smooth", block: "start" }) };
  } else if (detail.prep.ready) {
    heading = "Ready to start";
    line = "Everything on the checklist is done. Start it from the buttons at the top when it's time.";
  } else {
    heading = "Getting it ready";
    line = detail.prep.blockers[0] ?? "Add objectives and players, then open it for signups.";
  }

  const stage = <StatusBadge tone={e.status === "RUNNING" ? "good" : over ? "muted" : "warn"}>{STAGE[e.status]}</StatusBadge>;

  return (
    <section className="space-y-3" aria-label="This event at a glance">
      <div className={`rounded-xl border p-5 ${proofWaiting > 0 && (e.status === "RUNNING" || e.status === "SCORING") ? "border-red-500/40 bg-red-500/5" : "border-surface-border bg-surface"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase">
              {following ? "Next step" : "Right now"} {stage}
            </p>
            <p className="mt-1.5 text-lg font-semibold">{heading}</p>
            <p className="mt-0.5 text-sm text-muted">{line}</p>
          </div>
          {action && (
            <button type="button" onClick={action.run} className="shrink-0 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110">
              {action.label}
            </button>
          )}
        </div>
        {following && (
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
              <span>Before it starts</span>
              <span>
                {stepsDone} of {steps.length} done
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={stepsDone} aria-valuemin={0} aria-valuemax={steps.length} aria-label="Setup steps done">
              <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.round((stepsDone / steps.length) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatTile
          label="Players"
          value={e.maxParticipants ? `${players} / ${e.maxParticipants}` : players}
          hint={waiting > 0 ? `${waiting} on the waitlist` : e.maxParticipants ? "Places taken" : "No limit"}
          tone="plain"
          onClick={() => onOpen("players")}
        />
        <StatTile
          label="Proof waiting"
          value={proofWaiting}
          hint={proofWaiting === 0 ? "Nothing to decide" : "Open the proof queue"}
          tone={proofWaiting > 0 ? "bad" : "good"}
          onClick={() => onOpen("progress")}
        />
        {teamEvent ? (
          <StatTile label="Teams" value={detail.teams.length} hint={detail.setup.teamsFinalisedAt ? "Final" : "Not final yet"} tone="plain" onClick={() => onOpen("teams")} />
        ) : (
          <StatTile label="Objectives" value={detail.objectives.length} hint={detail.objectives.length === 0 ? "None yet" : "What players can score"} tone="plain" onClick={() => onOpen(e.template === "bingo" && e.config.board ? "board" : "objectives")} />
        )}
        {(detail.potVisible || detail.buyInEnabled) && <StatTile label="Pot" value={gp(detail.pot)} hint="Buy-ins paid so far" tone="plain" onClick={() => onOpen("prizes")} />}
        {(e.status === "SIGNUPS" || e.status === "DRAFT") && (
          <StatTile label="Signups close" value={e.config.signupClosesAt ? formatUtc(e.config.signupClosesAt).replace(" UTC", "") : "No deadline"} hint={e.config.signupClosesAt ? "UTC" : "Close them by hand"} tone="plain" />
        )}
      </div>
    </section>
  );
}
