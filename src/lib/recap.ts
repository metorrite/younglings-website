import { compact, full, type Recap, shortDay } from "@/lib/site";

/** One screen of the animated recap. Plain data, so the server can build it and hand it to the client player. */
export type Slide =
  | { kind: "intro"; eyebrow: string; title: string; subtitle: string; accent: string }
  | { kind: "number"; eyebrow: string; value: number; format: "xp" | "int"; caption: string; note?: string; accent: string }
  | { kind: "bars"; eyebrow: string; title: string; rows: { label: string; value: number }[]; format: "xp" | "int"; unit?: string; accent: string }
  | { kind: "chart"; eyebrow: string; title: string; points: { label: string; value: number }[]; highlight?: string; accent: string }
  | { kind: "stats"; eyebrow: string; title: string; items: { label: string; value: string; sub?: string }[]; chips?: string[]; accent: string }
  | { kind: "rank"; eyebrow: string; rank: number; outOf: number; caption: string; note?: string; accent: string };

export const ACCENTS = { gold: "#d4af37", blue: "#5aa9e6", violet: "#8b7cf6", green: "#3ecf8e", rose: "#e0627a", amber: "#e0a24a", teal: "#4cc9c0" };

export function recapPath(scope: "clan" | "member", period: string, rsn?: string): string {
  return scope === "clan" ? `/recap/clan/${period}` : `/recap/member/${encodeURIComponent(rsn ?? "")}/${period}`;
}

/** "Thursday 5 Oct" for a YYYY-MM-DD date. */
function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
}

/** The slides for a recap, in order, skipping any whose data is empty or private. The final "summary" slide is added by the player. */
export function buildSlides(recap: Recap): Slide[] {
  const slides: Slide[] = [];
  const { gold, blue, violet, green, rose, amber, teal } = ACCENTS;
  const clan = recap.scope === "clan";
  const name = recap.subject.name;
  const act = recap.activity.hidden ? null : recap.activity;
  const who = clan ? "the clan" : "you";

  slides.push({
    kind: "intro",
    eyebrow: recap.period.toDate ? "Recap so far" : "Recap",
    title: clan ? name : name,
    subtitle: recap.period.label,
    accent: gold,
  });

  slides.push({
    kind: "number",
    eyebrow: clan ? "Together we gained" : "You gained",
    value: recap.xp.total,
    format: "xp",
    caption: "experience points",
    note: clan
      ? `${recap.activeMembers ?? 0} members were active — about ${compact(recap.xp.perDay)} XP a day.`
      : `That's about ${compact(recap.xp.perDay)} XP a day over ${recap.period.days} day${recap.period.days === 1 ? "" : "s"}.`,
    accent: blue,
  });

  if (!clan && recap.ranking?.inRankings && recap.ranking.rank) {
    const r = recap.ranking;
    slides.push({
      kind: "rank",
      eyebrow: "Among the clan",
      rank: r.rank!,
      outOf: r.outOf,
      caption: `for XP gained${r.topPercent ? ` — the top ${r.topPercent}%` : ""}`,
      note: `${r.shareOfClan}% of everything the clan gained. The average member gained ${compact(r.clanAveragePerMember)}.`,
      accent: violet,
    });
  }

  if (recap.xp.series.length >= 2 && recap.xp.total > 0) {
    slides.push({
      kind: "chart",
      eyebrow: recap.xp.bySeriesUnit === "week" ? "Week by week" : "Day by day",
      title: recap.xp.bestDay ? `Biggest day: ${dayLabel(recap.xp.bestDay.date)} — ${compact(recap.xp.bestDay.xp)} XP` : "Your pace",
      points: recap.xp.series.map((p) => ({ label: shortDay(p.date), value: p.xp })),
      highlight: recap.xp.bestDay ? shortDay(recap.xp.bestDay.date) : undefined,
      accent: green,
    });
  }

  if (recap.skills.length > 0) {
    slides.push({
      kind: "bars",
      eyebrow: clan ? "Where the clan trained" : "Where your XP went",
      title: `${recap.skills[0].skill} led the way`,
      rows: recap.skills.slice(0, 6).map((s) => ({ label: s.skill, value: s.xp })),
      format: "xp",
      accent: amber,
    });
  }

  if (clan && recap.topGainers && recap.topGainers.length > 0) {
    slides.push({
      kind: "bars",
      eyebrow: "The grinders",
      title: `${recap.topGainers[0].rsn} gained the most`,
      rows: recap.topGainers.map((g) => ({ label: g.rsn, value: g.xp })),
      format: "xp",
      accent: gold,
    });
  }

  if (act && act.bossKills > 0) {
    slides.push({
      kind: "number",
      eyebrow: "Boss kills",
      value: act.bossKills,
      format: "int",
      caption: clan ? "monsters felled by the clan" : "monsters felled by you",
      note: act.topBosses[0] ? `${act.topBosses[0].boss} was the favourite — ${full(act.topBosses[0].kills)} kills.` : undefined,
      accent: rose,
    });
    if (act.topBosses.length > 1) {
      slides.push({ kind: "bars", eyebrow: "Favourite fights", title: "Most-killed bosses", rows: act.topBosses.map((b) => ({ label: b.boss, value: b.kills })), format: "int", accent: rose });
    }
  }

  if (clan && recap.topKillers && recap.topKillers.length > 0) {
    slides.push({ kind: "bars", eyebrow: "Boss hunters", title: `${recap.topKillers[0].rsn} killed the most`, rows: recap.topKillers.map((k) => ({ label: k.rsn, value: k.kills })), format: "int", accent: rose });
  }

  const caps = clan ? recap.citadel.capWeeks ?? 0 : recap.citadel.weeksCapped ?? 0;
  if (caps > 0 || (act && act.caps > 0)) {
    slides.push({
      kind: "stats",
      eyebrow: "At the Citadel",
      title: clan ? "The Citadel kept us busy" : "You kept the Citadel running",
      items: clan
        ? [
            { label: "Caps recorded", value: full(recap.citadel.capsRecorded) },
            { label: "Member-weeks capped", value: full(caps) },
            ...(recap.citadel.topCappers?.[0] ? [{ label: "Most weeks capped", value: recap.citadel.topCappers[0].rsn, sub: `${recap.citadel.topCappers[0].weeksCapped} weeks` }] : []),
          ]
        : [
            { label: "Weeks capped", value: full(caps) },
            { label: "Longest streak", value: `${recap.citadel.longestStreak ?? 0} week${(recap.citadel.longestStreak ?? 0) === 1 ? "" : "s"}` },
            { label: "Caps recorded", value: full(recap.citadel.capsRecorded) },
          ],
      accent: teal,
    });
  }

  if (act && (act.levelUps > 0 || act.quests > 0 || act.drops > 0 || act.xpMilestones > 0)) {
    slides.push({
      kind: "stats",
      eyebrow: "Along the way",
      title: `Milestones ${who} hit`,
      items: [
        { label: "Level-ups", value: full(act.levelUps) },
        { label: "Quests completed", value: full(act.quests) },
        { label: "XP milestones", value: full(act.xpMilestones), sub: act.twoHundredM > 0 ? `${act.twoHundredM} at 200M` : undefined },
        { label: "Notable drops", value: full(act.drops), sub: act.topDrops[0]?.item },
      ],
      accent: violet,
    });
  }

  if (clan && recap.roster && (recap.roster.joined > 0 || recap.roster.left > 0)) {
    slides.push({
      kind: "stats",
      eyebrow: "The roster",
      title: recap.roster.joined >= recap.roster.left ? "The clan grew" : "A few moved on",
      items: [
        { label: "Joined", value: `+${recap.roster.joined}` },
        { label: "Left", value: `−${recap.roster.left}` },
        { label: "Members now", value: String(recap.subject.memberCount ?? "—") },
      ],
      chips: recap.roster.newMembers,
      accent: green,
    });
  }

  if (!clan && recap.levels && recap.levels.gained !== null && recap.levels.gained > 0) {
    slides.push({
      kind: "number",
      eyebrow: "Total level",
      value: recap.levels.gained,
      format: "int",
      caption: "levels gained",
      note: `${recap.levels.start} → ${recap.levels.end}`,
      accent: gold,
    });
  }

  if (recap.points > 0) {
    slides.push({ kind: "number", eyebrow: "Clan points", value: recap.points, format: "int", caption: clan ? "points earned by members" : "points earned", accent: amber });
  }

  return slides;
}

/** A one-line description for link previews and accessible text. */
export function recapHeadline(recap: Recap): string {
  const who = recap.scope === "clan" ? "The clan" : recap.subject.name;
  const parts = [`${compact(recap.xp.total)} XP`];
  if (!recap.activity.hidden && recap.activity.bossKills > 0) parts.push(`${full(recap.activity.bossKills)} boss kills`);
  const caps = recap.scope === "clan" ? recap.citadel.capWeeks : recap.citadel.weeksCapped;
  if (caps) parts.push(`${caps} Citadel cap${caps === 1 ? "" : "s"}`);
  return `${who} — ${recap.period.label}: ${parts.join(" · ")}`;
}
