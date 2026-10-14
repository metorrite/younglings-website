"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, FormField, formatUtc, inputClass, Notice, primaryButton, StatusBadge } from "@/components/admin/ui";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { EventList, EventStatus } from "@/lib/eventTypes";
import { ChannelSelect } from "@/components/admin/pickers";
import { choicesOf, type GuildStructure, type WelcomeActionResult } from "@/lib/jonnybot-admin";

export type EventCall = (method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown) => Promise<WelcomeActionResult<unknown>>;

// RuneMetrics' skill order, which is what the bot's skill ids are (see RuneScapeSkillCatalog)
const SKILLS = ["Attack", "Defence", "Strength", "Constitution", "Ranged", "Prayer", "Magic", "Cooking", "Woodcutting", "Fletching", "Fishing", "Firemaking", "Crafting", "Smithing", "Mining", "Herblore", "Agility", "Thieving", "Slayer", "Farming", "Runecrafting", "Hunter", "Construction", "Summoning", "Dungeoneering", "Divination", "Invention", "Archaeology", "Necromancy"];

const TONE: Record<EventStatus, "good" | "muted" | "warn"> = { DRAFT: "muted", SIGNUPS: "warn", RUNNING: "good", SCORING: "warn", DONE: "muted", CANCELLED: "muted" };
export const STAGE_LABEL: Record<EventStatus, string> = { DRAFT: "Draft", SIGNUPS: "Signups open", RUNNING: "Running", SCORING: "Scoring", DONE: "Done", CANCELLED: "Cancelled" };

/** The server's events, and a form to start a new one. Every setting here can be changed later while the event is a draft or taking signups. */
export function EventListView({ initial, structure, guildId, call }: { initial: EventList; structure: GuildStructure; guildId: string; call: EventCall }) {
  const router = useRouter();
  const [events] = useState(initial.events);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState<"custom" | "bingo" | "scavenger-hunt" | "competition" | "boss-night">("custom");
  const [huntSteps, setHuntSteps] = useState("8");
  const [huntPoints, setHuntPoints] = useState("25");
  const [huntOrdered, setHuntOrdered] = useState(false);
  const [huntBonus, setHuntBonus] = useState("100");
  const [skillId, setSkillId] = useState("-1");
  const [bossName, setBossName] = useState("");
  const [bossKills, setBossKills] = useState("10");
  const [bossPoints, setBossPoints] = useState("10");
  const [xpPerPoint, setXpPerPoint] = useState("10000");
  const [boardSize, setBoardSize] = useState("5");
  const [lineBonus, setLineBonus] = useState("50");
  const [blackoutBonus, setBlackoutBonus] = useState("250");
  const [scoringMode, setScoringMode] = useState("INDIVIDUAL");
  const [scope, setScope] = useState("PRIVATE");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [buyIn, setBuyIn] = useState(false);
  const [buyInAmount, setBuyInAmount] = useState("");
  const [showPot, setShowPot] = useState(true);
  const [queue, setQueue] = useState("FIRST_COME");
  const [teamPolicy, setTeamPolicy] = useState("everyone");
  const [closes, setCloses] = useState("");
  const [signupChannel, setSignupChannel] = useState<string | null>(null);
  const [staffChannel, setStaffChannel] = useState<string | null>(null);
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [pending, start] = useTransition();

  function create() {
    setProblem(null);
    const config: Record<string, unknown> = { queue, teamPolicy };
    if (template === "boss-night") {
      if (bossName.trim()) config.boss = bossName.trim();
      config.kills = Number(bossKills);
      config.pointsPerKill = Number(bossPoints.replace(/[, ]/g, "") || 0);
    }
    if (template === "competition") {
      config.skillId = Number(skillId);
      config.xpPerPoint = Number(xpPerPoint.replace(/[, ]/g, "") || 0);
    }
    if (template === "scavenger-hunt") {
      config.steps = Number(huntSteps);
      config.stepPoints = Number(huntPoints.replace(/[, ]/g, "") || 0);
      config.ordered = huntOrdered;
      config.finishBonus = Number(huntBonus.replace(/[, ]/g, "") || 0);
    }
    if (template === "bingo") {
      config.board = { size: Number(boardSize) };
      config.lineBonus = Number(lineBonus.replace(/[, ]/g, "") || 0);
      config.blackoutBonus = Number(blackoutBonus.replace(/[, ]/g, "") || 0);
    }
    if (buyIn) config.buyIn = { enabled: true, kind: "IN_GAME", amount: Number(buyInAmount.replace(/[, ]/g, "")), showPot };
    if (closes) config.signupClosesAt = new Date(closes).toISOString();
    if (signupChannel && staffChannel) {
      config.signupChannelId = signupChannel;
      config.signupAdminChannelId = staffChannel;
    }
    start(async () => {
      const result = await call("POST", "events", { name, description, template, scoringMode, scope, maxParticipants: Number(maxParticipants || 0), config });
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
          <FormField label="Kind of event" hint="Templates make a starting set of objectives you can adjust. Custom starts empty.">
            <select className={inputClass} value={template} onChange={(e) => setTemplate(e.target.value as "custom" | "bingo" | "scavenger-hunt" | "competition" | "boss-night")}>
              <option value="custom">Custom (start empty)</option>
              <option value="bingo">Bingo</option>
              <option value="scavenger-hunt">Scavenger hunt</option>
              <option value="competition">Competition (XP gained)</option>
              <option value="boss-night">Boss night</option>
            </select>
          </FormField>
          {template === "bingo" && (
            <div className="grid gap-4 rounded-lg border border-surface-border p-4 md:grid-cols-3">
              <FormField label="Board size" hint="3 to 7 tiles across.">
                <select className={inputClass} value={boardSize} onChange={(e) => setBoardSize(e.target.value)}>
                  {[3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      {n} × {n} ({n * n} tiles)
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Bonus per line" hint="Row, column or diagonal. 0 for none.">
                <input className={inputClass} inputMode="numeric" value={lineBonus} onChange={(e) => setLineBonus(e.target.value)} />
              </FormField>
              <FormField label="Blackout bonus" hint="Every tile done. 0 for none.">
                <input className={inputClass} inputMode="numeric" value={blackoutBonus} onChange={(e) => setBlackoutBonus(e.target.value)} />
              </FormField>
            </div>
          )}
          {template === "boss-night" && (
            <div className="grid gap-4 rounded-lg border border-surface-border p-4 md:grid-cols-3">
              <FormField label="Boss">
                <input className={inputClass} value={bossName} maxLength={40} placeholder="Araxxor" onChange={(e) => setBossName(e.target.value)} />
              </FormField>
              <FormField label="Kills that count" hint="Up to 1,000.">
                <input className={inputClass} inputMode="numeric" value={bossKills} onChange={(e) => setBossKills(e.target.value)} />
              </FormField>
              <FormField label="Points per kill">
                <input className={inputClass} inputMode="numeric" value={bossPoints} onChange={(e) => setBossPoints(e.target.value)} />
              </FormField>
            </div>
          )}
          {template === "competition" && (
            <div className="grid gap-4 rounded-lg border border-surface-border p-4 md:grid-cols-2">
              <FormField label="Skill" hint="Players' linked accounts are read automatically, a few minutes behind. Players need a linked RuneScape name.">
                <select className={inputClass} value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                  <option value="-1">Overall XP</option>
                  {SKILLS.map((name, id) => (
                    <option key={name} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="XP for one point" hint="10,000 means 25,000 XP gained is 2 points. Counts up to 1,000 points.">
                <input className={inputClass} inputMode="numeric" value={xpPerPoint} onChange={(e) => setXpPerPoint(e.target.value)} />
              </FormField>
            </div>
          )}
          {template === "scavenger-hunt" && (
            <div className="grid gap-4 rounded-lg border border-surface-border p-4 md:grid-cols-4">
              <FormField label="Items to find" hint="3 to 30. Rename them into clues later.">
                <input className={inputClass} inputMode="numeric" value={huntSteps} onChange={(e) => setHuntSteps(e.target.value)} />
              </FormField>
              <FormField label="Points per item">
                <input className={inputClass} inputMode="numeric" value={huntPoints} onChange={(e) => setHuntPoints(e.target.value)} />
              </FormField>
              <FormField label="Bonus for everything" hint="0 for none.">
                <input className={inputClass} inputMode="numeric" value={huntBonus} onChange={(e) => setHuntBonus(e.target.value)} />
              </FormField>
              <div className="flex items-end">
                <Toggle checked={huntOrdered} onChange={setHuntOrdered} label="One after another" detail="Each item opens after the one before." />
              </div>
            </div>
          )}
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
            <p className="text-sm font-medium">Signup panel in Discord (optional)</p>
            <p className="text-xs text-muted">Choose both channels and a signup is posted for this event when you open signups. Players who sign up there join the event, and it closes at the deadline and when the event starts.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Post the signup in" as="group">
                <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={signupChannel} onChange={setSignupChannel} none="No signup panel" />
              </FormField>
              <FormField label="Staff panel in" as="group" hint="Where the staff controls for the signup go.">
                <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={staffChannel} onChange={setStaffChannel} none="Choose a staff channel" />
              </FormField>
            </div>
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
