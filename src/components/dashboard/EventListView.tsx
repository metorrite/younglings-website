"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, FormField, formatUtc, inputClass, Notice, primaryButton, StatusBadge } from "@/components/admin/ui";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { EventList, EventStatus } from "@/lib/eventTypes";
import type { WelcomeActionResult } from "@/lib/jonnybot-admin";

export type EventCall = (method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown) => Promise<WelcomeActionResult<unknown>>;

const TONE: Record<EventStatus, "good" | "muted" | "warn"> = { DRAFT: "muted", SIGNUPS: "warn", RUNNING: "good", SCORING: "warn", DONE: "muted", CANCELLED: "muted" };
export const STAGE_LABEL: Record<EventStatus, string> = { DRAFT: "Draft", SIGNUPS: "Signups open", RUNNING: "Running", SCORING: "Scoring", DONE: "Done", CANCELLED: "Cancelled" };

/** The server's events, and a form to start a new one. Every setting here can be changed later while the event is a draft or taking signups. */
export function EventListView({ initial, guildId, call }: { initial: EventList; guildId: string; call: EventCall }) {
  const router = useRouter();
  const [events] = useState(initial.events);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scoringMode, setScoringMode] = useState("INDIVIDUAL");
  const [scope, setScope] = useState("PRIVATE");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [buyIn, setBuyIn] = useState(false);
  const [buyInAmount, setBuyInAmount] = useState("");
  const [showPot, setShowPot] = useState(true);
  const [queue, setQueue] = useState("FIRST_COME");
  const [teamPolicy, setTeamPolicy] = useState("everyone");
  const [closes, setCloses] = useState("");
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [pending, start] = useTransition();

  function create() {
    setProblem(null);
    const config: Record<string, unknown> = { queue, teamPolicy };
    if (buyIn) config.buyIn = { enabled: true, kind: "IN_GAME", amount: Number(buyInAmount.replace(/[, ]/g, "")), showPot };
    if (closes) config.signupClosesAt = new Date(closes).toISOString();
    start(async () => {
      const result = await call("POST", "events", { name, description, template: "custom", scoringMode, scope, maxParticipants: Number(maxParticipants || 0), config });
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      const created = result.data as { event: { id: string } };
      router.push(`/dashboard/${guildId}/event-manager/${created.event.id}`);
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-semibold text-gold">Your events</h2>
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">No events yet. Start one below.</p>
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/dashboard/${guildId}/event-manager/${e.id}`} className="flex h-full flex-col gap-2 rounded-xl border border-surface-border bg-surface p-5 transition hover:border-gold/60">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold break-words">{e.name}</span>
                    <StatusBadge tone={TONE[e.status]}>{STAGE_LABEL[e.status]}</StatusBadge>
                  </div>
                  <p className="text-xs text-muted">
                    {e.scoringMode === "TEAM" ? "Teams" : "Solo players"} · {e.scope === "PRIVATE" ? "Clan only" : e.scope === "ALLIANCE" ? "Allies" : "Public"}
                    {e.maxParticipants ? ` · up to ${e.maxParticipants} players` : ""} · created {formatUtc(e.createdAt)}
                  </p>
                  {e.description && <p className="line-clamp-2 break-words text-sm text-muted">{e.description}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">A server can have up to {initial.maxOpen} unfinished events at once.</p>
      </section>

      <Card title="Start a new event" hint="Begin with the basics. You add objectives, teams, players and prizes on the next page.">
        <div className="space-y-4">
          {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Name">
              <input className={inputClass} value={name} maxLength={80} placeholder="Friday night bingo" onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Most players" hint="Leave empty for no limit. A full event gets a waitlist.">
              <input className={inputClass} inputMode="numeric" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Description">
            <textarea className={`${inputClass} min-h-20`} value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Who plays" hint="Teams add up points per team.">
              <select className={inputClass} value={scoringMode} onChange={(e) => setScoringMode(e.target.value)}>
                <option value="INDIVIDUAL">Solo players</option>
                <option value="TEAM">Teams</option>
              </select>
            </FormField>
            <FormField label="Who can see it" hint="Only your clan sees it by default.">
              <select className={inputClass} value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="PRIVATE">Clan only</option>
                <option value="ALLIANCE">Clan and allies</option>
                <option value="PUBLIC">Everyone</option>
              </select>
            </FormField>
            <FormField label="Signups close" hint="Optional. Staff can still add late entries.">
              <input className={inputClass} type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Who may join and share a team">
              <select className={inputClass} value={teamPolicy} onChange={(e) => setTeamPolicy(e.target.value)}>
                <option value="everyone">Everyone, mixed freely</option>
                <option value="home">Only this server</option>
                <option value="clanVsOutsiders">Clan members apart from everyone else</option>
                <option value="separate">Every kind of player on its own teams</option>
              </select>
            </FormField>
            <FormField label="When the event is full">
              <select className={inputClass} value={queue} onChange={(e) => setQueue(e.target.value)}>
                <option value="FIRST_COME">First come, first served</option>
                <option value="CLAN_FIRST">Clan members first</option>
              </select>
            </FormField>
          </div>
          <div className="space-y-3 rounded-lg border border-surface-border p-4">
            <Toggle checked={buyIn} onChange={setBuyIn} label="Buy-in" detail="Players pay in-game gp to enter, and the paid total makes the pot." />
            {buyIn && (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Buy-in per player (gp)">
                  <input className={inputClass} inputMode="numeric" value={buyInAmount} placeholder="5000000" onChange={(e) => setBuyInAmount(e.target.value)} />
                </FormField>
                <div className="flex items-end">
                  <Toggle checked={showPot} onChange={setShowPot} label="Show the pot to players" />
                </div>
              </div>
            )}
          </div>
          <button type="button" className={primaryButton} disabled={pending || name.trim().length < 3} onClick={create}>
            Create event
          </button>
        </div>
      </Card>
    </div>
  );
}
