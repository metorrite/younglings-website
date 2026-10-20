import Link from "next/link";
import type { ReactNode } from "react";
import { EventJoinButton } from "@/components/profile/EventJoinButton";
import { PageHeader, Panel, ProgressBar, StatTile } from "@/components/site/blocks";
import type { EventPage } from "@/lib/member";
import { compact, shortDate } from "@/lib/site";

const STAGE: Record<EventPage["event"]["status"], string> = { SIGNUPS: "Signups open", RUNNING: "Running", SCORING: "Scoring", DONE: "Finished", CANCELLED: "Cancelled" };
const TEMPLATE: Record<string, string> = { bingo: "Bingo", "scavenger-hunt": "Scavenger hunt", competition: "Competition", "boss-night": "Boss night", custom: "Event" };
const SUBMISSION: Record<"PENDING" | "APPROVED" | "DENIED", string> = { PENDING: "Waiting for staff", APPROVED: "Approved", DENIED: "Not accepted" };
const AWARD: Record<"PENDING" | "PAID" | "REVOKED" | "REFUNDED", string> = { PENDING: "Not paid yet", PAID: "Paid", REVOKED: "Revoked", REFUNDED: "Refunded" };
const BUY_IN: Record<"NONE" | "DUE" | "PAID" | "REFUNDED", string> = { NONE: "Not required", DUE: "Due: pay the host", PAID: "Paid", REFUNDED: "Refunded" };

function chip(text: string, tone: "good" | "warn" | "bad" | "muted") {
  const colour =
    tone === "good" ? "border-emerald-500/40 text-emerald-300" : tone === "warn" ? "border-gold/40 text-gold" : tone === "bad" ? "border-red-400/40 text-red-300" : "border-surface-border text-muted";
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${colour}`}>{text}</span>;
}

function when(iso: string | null): string {
  return iso ? shortDate(iso) : "—";
}

type NextStep = { tone: "good" | "warn" | "bad" | "muted"; title: string; body: ReactNode };

/**
 * The one thing a player in the event should know first: what to do now (or that there is nothing to do). Worked out from where the event is and what is
 * still open for them, most urgent first: a turned-down verification, a verification not sent, a buy-in not paid, then the stage of the event.
 */
function nextStep(data: EventPage): NextStep | null {
  const { event, me } = data;
  if (!me || me.waiting) return null;
  const v = me.verification;
  if (v.required && v.state === "REJECTED")
    return {
      tone: "bad",
      title: "Your verification was turned down",
      body: (
        <>
          {v.note ? <>{v.note}{/[.!?]$/.test(v.note.trim()) ? " " : ". "}</> : null}Fix it and send it again with <code>/submit event-verify</code> in Discord.
        </>
      ),
    };
  if (v.required && v.state === "PENDING")
    return v.waitingProof
      ? { tone: "muted", title: "Staff are looking at your proof", body: "You'll be told as soon as they decide. Nothing to do until then." }
      : {
          tone: "warn",
          title: "Verify yourself to take part",
          body: (
            <>
              {event.verificationInstructions ? <>{event.verificationInstructions}{/[.!?]$/.test(event.verificationInstructions.trim()) ? " " : ". "}</> : null}Send it with <code>/submit event-verify</code> in Discord.
            </>
          ),
        };
  if (me.buyIn.enabled && me.buyIn.status === "DUE")
    return { tone: "warn", title: "Pay your buy-in", body: <>The buy-in is {compact(me.buyIn.amount)} gp, paid to the host. They mark it paid once they have it.</> };
  if (event.status === "SIGNUPS")
    return {
      tone: "muted",
      title: "You're in",
      body:
        event.scoringMode === "TEAM" && !me.team
          ? "Organisers build the teams after signups close. You'll get a team role and channel then."
          : event.startsAt
            ? `Nothing to do until it starts on ${shortDate(event.startsAt)}.`
            : "Nothing to do until it starts.",
    };
  if (event.status === "RUNNING")
    return {
      tone: "good",
      title: "The event is running",
      body: (
        <>
          Do the objectives, then send proof with <code>/submit event</code> in your channel. Staff decide it, and you can follow it under &ldquo;What you&apos;ve sent&rdquo; below.
        </>
      ),
    };
  if (event.status === "SCORING") return { tone: "muted", title: "Scoring", body: "Staff are checking the last proof and working out the places." };
  if (event.status === "DONE") return { tone: "good", title: "This event is finished", body: "Your place and any prizes are below." };
  return null;
}

const NEXT_TONE: Record<NextStep["tone"], string> = {
  good: "border-emerald-500/40 bg-emerald-500/5",
  warn: "border-gold/50 bg-gold/5",
  bad: "border-red-400/50 bg-red-500/5",
  muted: "border-surface-border bg-surface",
};

function prizeText(p: { kind: "IN_GAME" | "CLAN_POINTS" | "OTHER"; description: string; amount: number }): string {
  return p.kind === "CLAN_POINTS" ? `${p.amount.toLocaleString("en-GB")} clan points` : p.amount > 0 ? `${p.description || "Prize"} (${compact(p.amount)} gp)` : p.description || "Prize";
}

/** The player-facing page of one event: where it is in its life, the player's own place in it, and what they can do next. */
export function EventView({ data }: { data: EventPage }) {
  const { event, me } = data;
  const running = event.status === "RUNNING";
  const scored = running || event.status === "SCORING" || event.status === "DONE";
  const done = data.objectives?.filter((o) => o.done > 0).length ?? 0;
  const total = data.objectives?.length ?? 0;
  const spots = event.maxParticipants > 0 ? `${event.players} of ${event.maxParticipants} places taken` : `${event.players} players`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6">
      <Link href="/clan-events" className="text-sm text-muted hover:text-gold">
        ← All clan events
      </Link>
      <PageHeader
        title={event.name}
        subtitle={
          <>
            {TEMPLATE[event.template] ?? "Event"} · {event.scoringMode === "TEAM" ? "Teams" : "Solo"} · {spots}
          </>
        }
      >
        {chip(STAGE[event.status], running ? "good" : event.status === "DONE" || event.status === "CANCELLED" ? "muted" : "warn")}
      </PageHeader>

      {event.description && <p className="text-sm break-words whitespace-pre-line text-muted">{event.description}</p>}

      <Panel title="Timeline">
        <ol className="grid gap-3 text-sm sm:grid-cols-3">
          <li>
            <p className="text-xs tracking-wider text-muted uppercase">Signups</p>
            <p>{event.signupsClosed ? "Closed" : event.signupClosesAt ? `Close ${when(event.signupClosesAt)}` : event.status === "SIGNUPS" ? "Open" : "Over"}</p>
          </li>
          <li>
            <p className="text-xs tracking-wider text-muted uppercase">Starts</p>
            <p>{when(event.startsAt)}</p>
          </li>
          <li>
            <p className="text-xs tracking-wider text-muted uppercase">Ends</p>
            <p>{when(event.endsAt)}</p>
          </li>
        </ol>
      </Panel>

      {/* not in the event yet: what it is, and a way in */}
      {!me && (
        <Panel title="Take part">
          <div className="space-y-3 text-sm">
            {event.buyIn.enabled && <p className="text-muted">Buy-in {compact(event.buyIn.amount)} gp, paid to the host.</p>}
            {event.verificationRequired && <p className="text-muted">Players are verified before the event. {event.verificationInstructions}</p>}
            {event.signupsClosed ? <p className="text-gold">Signups have closed.</p> : <EventJoinButton eventId={event.id} mode="join" />}
          </div>
        </Panel>
      )}

      {me && (
        <>
          {me.waiting && <p className="rounded-xl border border-gold/40 p-4 text-sm text-gold">You are on the waitlist. You will be let in if a place opens up.</p>}

          {(() => {
            const next = nextStep(data);
            return next ? (
              <section className={`rounded-xl border p-5 ${NEXT_TONE[next.tone]}`} aria-label="What to do next">
                <p className="text-xs font-semibold tracking-wider text-muted uppercase">What to do next</p>
                <p className="mt-1 text-lg font-semibold">{next.title}</p>
                <p className="mt-1 text-sm text-muted [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-foreground">{next.body}</p>
              </section>
            ) : null;
          })()}

          {me.verification.required && !me.waiting && (me.verification.state === "VERIFIED" || me.verification.state === "WAIVED") && (
            <Panel title="Verification">
              <div className="space-y-2 text-sm">
                {me.verification.state === "VERIFIED" && <p>{chip("Verified", "good")}</p>}
                {me.verification.state === "WAIVED" && <p>{chip("Let through without verification", "good")}</p>}
              </div>
            </Panel>
          )}

          {scored && !me.waiting && data.standings && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.standings.hidden ? (
                <StatTile label="Your place" value="Hidden" sub={data.standings.hiddenText ?? "The organisers keep the standings to themselves."} />
              ) : (
                <StatTile
                  label="Your place"
                  value={data.standings.myRank > 0 ? `${data.standings.myRank}` : "Not yet"}
                  sub={data.standings.myRank > 0 ? `of ${data.standings.of} ${event.scoringMode === "TEAM" ? "teams" : "players"}` : "No points scored yet"}
                />
              )}
              <StatTile label="Points" value={data.standings.myPoints.toLocaleString("en-GB")} sub={event.scoringMode === "TEAM" ? "your team's total" : undefined} />
              {total > 0 && <StatTile label="Done" value={`${done} / ${total}`} sub="objectives" />}
            </div>
          )}
          {scored && !me.waiting && total > 0 && <ProgressBar value={done} max={total} />}

          {event.scoringMode === "TEAM" && (
            <Panel title={me.team ? `Your team: ${me.team}` : "Your team"}>
              {data.teammates && data.teammates.length > 0 ? (
                <ul className="flex flex-wrap gap-2 text-sm">
                  {data.teammates.map((t, i) => (
                    <li key={i} className={`rounded-full border px-3 py-1 ${t.me ? "border-gold/50 text-gold" : "border-surface-border"}`}>
                      {t.name}
                      {t.me ? " (you)" : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">You haven&apos;t been put on a team yet. Organisers build the teams after signups close.</p>
              )}
            </Panel>
          )}

          {data.channels && data.channels.length > 0 && (
            <Panel title="Channels" hint="Open them in Discord.">
              <ul className="flex flex-wrap gap-2 text-sm">
                {data.channels.map((c) => (
                  <li key={c.url}>
                    <a href={c.url} target="_blank" rel="noreferrer noopener" className="inline-block rounded-lg border border-surface-border px-3 py-1.5 text-gold hover:border-gold/50">
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {data.board && data.board.tiles.length > 0 && (
            <Panel title="Your board" hint={running ? "Send proof for a tile with /submit event in your channel." : undefined}>
              <ul className={data.board.columns > 0 ? "grid gap-2" : "space-y-1"} style={data.board.columns > 0 ? { gridTemplateColumns: `repeat(${data.board.columns}, minmax(0, 1fr))` } : undefined}>
                {data.board.tiles.map((t) => (
                  <li
                    key={t.n}
                    className={`rounded-lg border p-2 text-center text-xs break-words ${t.done ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200" : t.locked ? "border-surface-border opacity-50" : "border-surface-border"}`}
                  >
                    <span className="block text-[10px] text-muted">{t.n}</span>
                    {t.label}
                    <span className="block text-[10px] text-muted">{t.done ? "done" : t.locked ? "locked" : `${t.points} pts`}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {!data.board && data.objectives && data.objectives.length > 0 && (
            <Panel title="Your objectives" hint={running ? "Send proof for one with /submit event in your channel." : undefined}>
              <ul className="divide-y divide-surface-border/60 text-sm">
                {data.objectives.map((o) => (
                  <li key={o.key} className="flex items-center justify-between gap-3 py-1.5">
                    <span className={o.done > 0 ? "" : "text-muted"}>{o.label}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">{o.done > 0 ? `done${o.repeatLimit > 1 ? ` ×${o.done}` : ""}` : `${o.points} pts`}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {scored && data.standings?.hidden && (
            <Panel title="Standings">
              <p className="text-sm text-muted">{data.standings.hiddenText ?? "The organisers keep the standings to themselves."}</p>
            </Panel>
          )}
          {data.standings && data.standings.rows.length > 0 && (
            <Panel title="Standings">
              <ol className="divide-y divide-surface-border/60 text-sm">
                {data.standings.rows.map((r) => (
                  <li key={r.rank} className={`flex items-center justify-between gap-3 py-1.5 ${r.me ? "text-gold" : ""}`}>
                    <span className="min-w-0 break-words">
                      <span className="mr-2 tabular-nums text-muted">{r.rank}.</span>
                      {r.name}
                      {r.me ? " (you)" : ""}
                    </span>
                    <span className="shrink-0 tabular-nums">{r.points.toLocaleString("en-GB")} pts</span>
                  </li>
                ))}
              </ol>
              {data.standings.of > data.standings.rows.length && <p className="mt-2 text-xs text-muted">Showing the top of {data.standings.of}, plus you.</p>}
            </Panel>
          )}

          {data.submissions && data.submissions.length > 0 && (
            <Panel title="What you've sent" hint="Your proof and how staff decided it.">
              <ul className="divide-y divide-surface-border/60 text-sm">
                {data.submissions.map((s) => (
                  <li key={s.id} className="space-y-0.5 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        #{s.id} · {s.label}
                      </span>
                      {chip(SUBMISSION[s.status], s.status === "APPROVED" ? "good" : s.status === "DENIED" ? "bad" : "warn")}
                    </div>
                    {s.status === "DENIED" && s.decisionNote && <p className="text-xs text-red-300">{s.decisionNote}</p>}
                    <p className="text-xs text-muted">{shortDate(s.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Prizes and buy-in">
            <div className="space-y-3 text-sm">
              {me.buyIn.enabled && (
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-muted">Buy-in {compact(me.buyIn.amount)} gp</span>
                  {chip(BUY_IN[me.buyIn.status], me.buyIn.status === "PAID" ? "good" : me.buyIn.status === "DUE" ? "warn" : "muted")}
                </p>
              )}
              {data.prizes.length === 0 ? (
                <p className="text-muted">No prizes have been set for this event.</p>
              ) : (
                <ul className="divide-y divide-surface-border/60">
                  {data.prizes.map((p, i) => (
                    <li key={i} className="py-1.5">
                      <span className="text-muted tabular-nums">{p.placeTo > p.place ? `#${p.place}–${p.placeTo}` : `#${p.place}`}</span> {prizeText(p)}
                    </li>
                  ))}
                </ul>
              )}
              {data.awards && data.awards.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs tracking-wider text-muted uppercase">Yours</p>
                  <ul className="divide-y divide-surface-border/60">
                    {data.awards.map((a, i) => (
                      <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                        <span>
                          <span className="text-muted tabular-nums">#{a.place}</span> {prizeText(a)}
                        </span>
                        {chip(AWARD[a.status], a.status === "PAID" ? "good" : a.status === "PENDING" ? "warn" : "muted")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Panel>

          {event.status === "SIGNUPS" && <EventJoinButton eventId={event.id} mode="leave" />}
        </>
      )}
    </div>
  );
}
