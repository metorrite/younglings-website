import Link from "next/link";
import { EventJoinButton } from "@/components/profile/EventJoinButton";
import { Panel, ProgressBar, StatTile } from "@/components/site/blocks";
import type { MyEvent, MyEvents } from "@/lib/member";
import { compact, shortDate } from "@/lib/site";

const STAGE: Record<MyEvent["status"], string> = { SIGNUPS: "Signups open", RUNNING: "Running", SCORING: "Scoring", DONE: "Finished", CANCELLED: "Cancelled" };
const TEMPLATE: Record<string, string> = { bingo: "Bingo", "scavenger-hunt": "Scavenger hunt", competition: "Competition", "boss-night": "Boss night", custom: "Event" };
const AWARD: Record<MyEvent["awards"][number]["status"], string> = { PENDING: "Not paid yet", PAID: "Paid", REVOKED: "Revoked", REFUNDED: "Refunded" };
const BUY_IN: Record<MyEvent["buyIn"]["status"], string> = { NONE: "Not required", DUE: "Due: pay the host", PAID: "Paid", REFUNDED: "Refunded" };

function chip(text: string, tone: "good" | "warn" | "muted") {
  const colour = tone === "good" ? "border-emerald-500/40 text-emerald-300" : tone === "warn" ? "border-gold/40 text-gold" : "border-surface-border text-muted";
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${colour}`}>{text}</span>;
}

function EventCard({ e }: { e: MyEvent }) {
  const completed = e.objectives.filter((o) => o.done > 0).length;
  const showStanding = (e.status === "RUNNING" || e.status === "SCORING" || e.status === "DONE") && !e.waiting;
  return (
    <li className="space-y-4 rounded-xl border border-surface-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold break-words">
            <Link href={`/clan-events/${e.id}`} className="hover:text-gold">
              {e.name}
            </Link>
          </h3>
          <p className="text-xs text-muted">
            {TEMPLATE[e.template] ?? "Event"} · {e.scoringMode === "TEAM" ? (e.team ? `Team ${e.team}` : "Teams") : "Solo"}
          </p>
        </div>
        {chip(STAGE[e.status], e.status === "RUNNING" ? "good" : e.status === "DONE" || e.status === "CANCELLED" ? "muted" : "warn")}
      </div>

      {e.waiting && <p className="text-sm text-gold">You are on the waitlist. You will be let in if a place opens up.</p>}

      {e.verification.required && !e.waiting && e.verification.state !== "NOT_REQUIRED" && (
        <div className="space-y-1 text-sm">
          {e.verification.state === "VERIFIED" && <p>{chip("Verified", "good")}</p>}
          {e.verification.state === "WAIVED" && <p>{chip("Let through without verification", "good")}</p>}
          {e.verification.state === "PENDING" && (
            <p className="text-gold">
              Waiting for verification. {e.verification.instructions}
            </p>
          )}
          {e.verification.state === "REJECTED" && (
            <p className="text-red-300">
              Your verification was turned down{e.verification.note ? `: ${e.verification.note}` : "."} {e.verification.instructions}
            </p>
          )}
        </div>
      )}

      {showStanding && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Your place" value={e.rank > 0 ? `${e.rank}` : "Not yet"} sub={e.rank > 0 ? `of ${e.of} ${e.scoringMode === "TEAM" ? "teams" : "players"}` : "No points scored yet"} />
          <StatTile label="Points" value={e.points.toLocaleString("en-GB")} sub={e.scoringMode === "TEAM" ? "your team's total" : undefined} />
          {e.objectives.length > 0 && <StatTile label="Done" value={`${completed} / ${e.objectives.length}`} sub="objectives" />}
        </div>
      )}
      {showStanding && e.objectives.length > 0 && <ProgressBar value={completed} max={e.objectives.length} />}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {e.buyIn.enabled && (
          <span className="flex items-center gap-2">
            <span className="text-muted">Buy-in {compact(e.buyIn.amount)} gp</span>
            {chip(BUY_IN[e.buyIn.status], e.buyIn.status === "PAID" ? "good" : e.buyIn.status === "DUE" ? "warn" : "muted")}
          </span>
        )}
        {e.pendingProof > 0 && chip(`${e.pendingProof} proof waiting for review`, "warn")}
      </div>

      {e.status === "SIGNUPS" && <EventJoinButton eventId={e.id} mode="leave" />}

      {e.awards.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs tracking-wider text-muted uppercase">Your prizes</p>
          <ul className="divide-y divide-surface-border/60 text-sm">
            {e.awards.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="text-muted tabular-nums">#{a.place}</span>{" "}
                  {a.kind === "CLAN_POINTS" ? `${a.amount.toLocaleString("en-GB")} clan points` : a.amount > 0 ? `${a.description || "Prize"} (${compact(a.amount)} gp)` : a.description || "Prize"}
                </span>
                {chip(AWARD[a.status], a.status === "PAID" ? "good" : a.status === "PENDING" ? "warn" : "muted")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showStanding && e.objectives.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gold">Your objectives</summary>
          <ul className="mt-2 divide-y divide-surface-border/60">
            {e.objectives.map((o) => (
              <li key={o.key} className="flex items-center justify-between gap-3 py-1.5">
                <span className={o.done > 0 ? "" : "text-muted"}>{o.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted">{o.done > 0 ? `done${o.repeatLimit > 1 ? ` ×${o.done}` : ""}` : `${o.points} pts`}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

/** The signed-in member's own view of events: where they stand, what they owe or are owed, and what is open to join. */
export function MyEventsPanel({ data }: { data: MyEvents }) {
  return (
    <div className="space-y-6">
      <Panel title="Your events" hint="Events you have joined, with your place, points, buy-in and prizes. Only you see this.">
        {data.events.length === 0 ? (
          <p className="text-sm text-muted">You haven&apos;t joined any events yet.</p>
        ) : (
          <ul className="space-y-4">
            {data.events.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </ul>
        )}
      </Panel>
      {data.open.length > 0 && (
        <Panel title="Open for signup" hint="Join here or from the signup message in Discord. You need to be in the server's Discord to take part.">
          <ul className="divide-y divide-surface-border/60 text-sm">
            {data.open.map((o) => (
              <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">
                    {o.name}{" "}
                    <span className="text-xs text-muted">
                      · {TEMPLATE[o.template] ?? "Event"} · {o.scoringMode === "TEAM" ? "Teams" : "Solo"}
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {o.closed ? "Signups are closed" : o.signupClosesAt ? `Signups close ${shortDate(o.signupClosesAt)}` : "No signup deadline"}
                    {o.buyIn > 0 ? ` · Buy-in ${compact(o.buyIn)} gp` : ""}
                    {o.verification ? " · Needs verification" : ""}
                  </p>
                </div>
                {!o.closed && <EventJoinButton eventId={o.id} mode="join" />}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
