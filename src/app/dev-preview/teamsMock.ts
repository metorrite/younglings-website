// A throwaway stand-in for the bot's team routes, so the team builder can be tried in the preview without a bot. Not committed (the folder is git-excluded).
import type { EventDetail, EventPlayer } from "@/lib/eventTypes";

type Result = { ok: true; data: unknown } | { ok: false; error: string; problems: string[] };

const NAMES = ["Metorrite", "KinkyAstroid", "UntamedWrath", "S1GENERAL", "Xtusy", "Nexersys7", "Sprinkzzz", "Big_Don", "Burningsol1", "Berserker87", "wishmakerz", "Hodant", "XHailGailX", "Joel Hendrix", "Zezima", "Lynx Titan"];
const XP = [5_200_000_000, 3_900_000_000, 2_400_000_000, 1_500_000_000, 900_000_000, 400_000_000, 250_000_000, 120_000_000, null, null, 4_400_000_000, 700_000_000, 60_000_000, null, 4_900_000_000, 300_000_000];

function player(i: number): EventPlayer {
  const xp = XP[i];
  return {
    userId: String(1000 + i),
    userName: NAMES[i],
    source: "SELF",
    guildId: "1",
    teamId: null,
    joinedAt: "2026-10-12T12:00:00Z",
    kind: i === 3 ? "HOME_OTHER" : i === 9 ? "PARTNER" : "HOME_CLAN",
    waiting: i >= 14,
    buyIn: "NONE",
    verification: i === 4 || i === 5 ? "PENDING" : i === 6 ? "REJECTED" : "VERIFIED",
    verifiedBy: null,
    verifiedAt: null,
    verificationNote: i === 6 ? "The bank was cropped" : "",
    rating: i === 0 ? 5 : i === 12 ? 2 : null,
    suggestedRating: null,
    effectiveRating: null,
    strength: xp === null ? null : { rsn: NAMES[i].replace(" ", "_") + "RS", totalLevel: 1400 + Math.round(xp / 2_000_000), combatLevel: xp > 1_000_000_000 ? 138 : 110, totalXp: xp },
    teamBlock: null,
  };
}

export function initialTeamsDetail(): EventDetail {
  const players = Array.from({ length: 16 }, (_, i) => player(i));
  const detail = {
    layout: null,
    tiles: [],
    organisers: [],
    refused: [],
    event: { archived: false, id: "9", name: "Friday Night Bingo", description: "", template: "custom", status: "SIGNUPS", scope: "PRIVATE", scoringMode: "TEAM", startsAt: null, endsAt: null, maxParticipants: 0, config: { setup: { mode: "STANDARD" }, verification: { required: true, gate: "TEAMS", instructions: "A screenshot of your bank." } }, createdAt: "2026-10-11T12:00:00Z" },
    objectives: [],
    teams: [
      { id: "1", name: "Red", captainId: null },
      { id: "2", name: "Blue", captainId: null },
      { id: "3", name: "Green", captainId: null },
    ],
    participants: players,
    signup: { attached: false, active: false, entries: 0, channelsChosen: false },
    prizes: [],
    pot: 0,
    potVisible: false,
    buyInEnabled: false,
    nextStages: [],
    editable: true,
    prep: { steps: [], blockers: [], warnings: [], ready: false },
    setup: { signupsClosedAt: "2026-10-14T10:00:00Z", signupsClosedBy: "Metorrite", rosterConfirmedAt: "2026-10-14T11:00:00Z", rosterConfirmedBy: "Metorrite", teamsFinalisedAt: null, teamsFinalisedBy: null },
    verification: { required: true, gate: "TEAMS", instructions: "A screenshot of your bank.", verified: 11, waived: 0, pending: 2, rejected: 1 },
  } as unknown as EventDetail;
  return recompute(detail);
}

/** Ratings suggested among the players with stats, who may be placed, and the teams step of the checklist: what the bot works out on every answer. */
function recompute(d: EventDetail): EventDetail {
  const known = d.participants.filter((p) => !p.waiting && p.strength).sort((a, b) => a.strength!.totalXp - b.strength!.totalXp);
  const suggested = new Map<string, number>();
  if (known.length >= 2) known.forEach((p, i) => suggested.set(p.userId, 1 + Math.round((i * 4) / (known.length - 1))));
  for (const p of d.participants) {
    p.suggestedRating = suggested.get(p.userId) ?? null;
    p.effectiveRating = p.waiting ? null : (p.rating ?? p.suggestedRating ?? 3);
    p.teamBlock = p.waiting ? "That player is on the waitlist, so they can't be put on a team yet." : p.verification === "REJECTED" ? "That player's verification was turned down, so they can't be put on a team. Verify or waive them first." : p.verification === "PENDING" ? "That player hasn't been verified, which this event needs before teams are made. Verify or waive them first." : null;
  }
  const active = d.participants.filter((p) => !p.waiting);
  const pool = active.filter((p) => p.teamBlock === null || p.teamId !== null);
  const eligible = active.filter((p) => p.teamBlock === null);
  const unassigned = eligible.filter((p) => p.teamId === null).length;
  const empty = d.teams.filter((t) => !active.some((p) => p.teamId === t.id)).map((t) => t.name);
  const onTeamBlocked = active.filter((p) => p.teamBlock !== null && p.teamId !== null).length;
  const problems: string[] = [];
  if (d.teams.length === 0) problems.push("Create the teams.");
  else {
    if (unassigned > 0) problems.push(`${unassigned} ${unassigned === 1 ? "player still needs" : "players still need"} a team.`);
    if (empty.length > 0) problems.push(empty.length === 1 ? `Team ${empty[0]} has no players: add some or remove it.` : `${empty.length} teams have no players (${empty.join(", ")}): add some or remove them.`);
    if (onTeamBlocked > 0) problems.push(`${onTeamBlocked} ${onTeamBlocked === 1 ? "player on a team hasn't" : "players on teams haven't"} passed verification: verify, waive or take them off their team.`);
  }
  const finalised = d.setup.teamsFinalisedAt !== null;
  const done = problems.length === 0 && finalised;
  const why = done ? [] : problems.length > 0 ? problems : ["Finalise the teams."];
  const placed = eligible.length - unassigned;
  d.prep = {
    steps: [{ key: "teams", label: "Teams", state: done ? "DONE" : "ACTIVE", required: true, detail: `${d.teams.length} teams, ${placed} of ${eligible.length} players placed.` + (problems.length === 0 ? (done ? "" : " Check them, then finalise.") : " " + problems.join(" ")), blockers: why }],
    blockers: why,
    warnings: [],
    ready: done,
  };
  void pool;
  return d;
}

const clone = (d: EventDetail): EventDetail => JSON.parse(JSON.stringify(d)) as EventDetail;
const fail = (error: string, problems: string[] = []): Result => ({ ok: false, error, problems });

export function makeTeamsCall(get: () => EventDetail, set: (d: EventDetail) => void) {
  return async (method: string, path: string, body?: unknown): Promise<Result> => {
    await new Promise((r) => setTimeout(r, 250));
    const d = clone(get());
    const b = (body ?? {}) as Record<string, unknown>;
    const rest = path.replace(/^events\/9\//, "");
    const finish = (): Result => {
      set(recompute(d));
      return { ok: true, data: recompute(d) };
    };
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^participants\/(\d+)$/)) && method === "PUT") {
      const p = d.participants.find((x) => x.userId === m![1]);
      if (!p) return fail("That player isn't in the event.");
      if (b.teamId !== null && p.teamBlock !== null) return fail(p.teamBlock);
      p.teamId = (b.teamId as string | null) ?? null;
      d.teams.forEach((t) => {
        if (t.captainId === p.userId && t.id !== p.teamId) t.captainId = null;
      });
      return finish();
    }
    if ((m = rest.match(/^participants\/(\d+)\/rating$/)) && method === "PUT") {
      const p = d.participants.find((x) => x.userId === m![1]);
      if (!p) return fail("That player isn't in the event.");
      const rating = b.rating as number | null;
      if (rating !== null && (rating < 1 || rating > 5)) return fail("A rating is from 1 (weakest) to 5 (strongest).");
      p.rating = rating;
      return finish();
    }
    if ((m = rest.match(/^participants\/(\d+)\/verification$/)) && method === "PUT") {
      const p = d.participants.find((x) => x.userId === m![1]);
      if (!p) return fail("That player isn't in the event.");
      p.verification = b.state === "verified" ? "VERIFIED" : "WAIVED";
      return finish();
    }
    if (rest === "teams" && method === "POST") {
      const name = String(b.name ?? "").trim();
      if (!name) return fail("Give the team a name.");
      if (d.teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) return fail("There is already a team with that name, or the event has the most teams allowed (100).");
      d.teams.push({ id: String(10 + d.teams.length), name, captainId: null });
      return finish();
    }
    if ((m = rest.match(/^teams\/(\d+)$/))) {
      const team = d.teams.find((t) => t.id === m![1]);
      if (!team) return fail("That team doesn't exist.");
      if (method === "DELETE") {
        d.teams = d.teams.filter((t) => t.id !== team.id);
        d.participants.forEach((p) => {
          if (p.teamId === team.id) p.teamId = null;
        });
        return finish();
      }
      if ("name" in b) {
        if (d.teams.some((t) => t.id !== team.id && t.name.toLowerCase() === String(b.name).toLowerCase())) return fail("There is already a team with that name.");
        team.name = String(b.name);
      }
      if ("captainId" in b) {
        if (b.captainId !== null && !d.participants.some((p) => p.userId === b.captainId && p.teamId === team.id)) return fail("A captain has to be a player on that team.");
        team.captainId = (b.captainId as string | null) ?? null;
      }
      return finish();
    }
    if (rest === "teams/suggest" && method === "POST") {
      const total = new Map(d.teams.map((t) => [t.id, d.participants.filter((p) => p.teamId === t.id).reduce((s, p) => s + (p.effectiveRating ?? 3), 0)]));
      const size = new Map(d.teams.map((t) => [t.id, d.participants.filter((p) => p.teamId === t.id).length]));
      const moves: { userId: string; teamId: string }[] = [];
      const order = d.participants.filter((p) => !p.waiting && p.teamBlock === null && p.teamId === null).sort((a, b) => (b.effectiveRating ?? 3) - (a.effectiveRating ?? 3) || (b.strength?.totalXp ?? 0) - (a.strength?.totalXp ?? 0));
      for (const p of order) {
        let best = d.teams[0];
        for (const t of d.teams) if (total.get(t.id)! < total.get(best.id)! || (total.get(t.id) === total.get(best.id) && size.get(t.id)! < size.get(best.id)!)) best = t;
        moves.push({ userId: p.userId, teamId: best.id });
        total.set(best.id, total.get(best.id)! + (p.effectiveRating ?? 3));
        size.set(best.id, size.get(best.id)! + 1);
      }
      return { ok: true, data: { moves, notes: [] } };
    }
    if (rest === "teams/assign" && method === "PUT") {
      for (const a of (b.assignments as { userId: string; teamId: string | null }[]) ?? []) {
        const p = d.participants.find((x) => x.userId === a.userId);
        if (p) p.teamId = a.teamId;
      }
      return finish();
    }
    if (rest === "teams/finalise" && method === "POST") {
      const step = recompute(clone(d)).prep.steps[0];
      const problems = step.blockers.filter((x) => x !== "Finalise the teams.");
      if (problems.length > 0) return fail("The teams can't be final yet.", problems);
      d.setup.teamsFinalisedAt = new Date().toISOString();
      d.setup.teamsFinalisedBy = "Metorrite";
      return finish();
    }
    if (rest === "teams/reopen" && method === "POST") {
      d.setup.teamsFinalisedAt = null;
      d.setup.teamsFinalisedBy = null;
      return finish();
    }
    return fail("Preview only: " + method + " " + path);
  };
}
