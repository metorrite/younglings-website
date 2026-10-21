import type { AlliancePage, ClanAlliances, ClanDetail, ClanSummary, HubEvent, LeaderboardEntry } from "@/lib/clansHub";

/** Made-up clans for judging the hub's layout with a full directory (`HUB_DEMO=true`, local only). Deterministic, so a screenshot is repeatable. */

const FOCUS = {
  PVM: { key: "PVM", label: "PvM" },
  SKILLING: { key: "SKILLING", label: "Skilling" },
  SOCIAL: { key: "SOCIAL", label: "Social" },
  EVENTS: { key: "EVENTS", label: "Events" },
  COMPETITIVE: { key: "COMPETITIVE", label: "Competitive" },
  CASUAL: { key: "CASUAL", label: "Casual" },
  IRONMAN: { key: "IRONMAN", label: "Ironman" },
  NEW_PLAYERS: { key: "NEW_PLAYERS", label: "New player friendly" },
};
const REC = {
  OPEN: { key: "OPEN" as const, label: "Recruiting" },
  INVITE_ONLY: { key: "INVITE_ONLY" as const, label: "Invite only" },
  CLOSED: { key: "CLOSED" as const, label: "Not recruiting" },
};

type Seed = [name: string, tagline: string, colour: number | null, focus: (keyof typeof FOCUS)[], rec: keyof typeof REC, members: number, xp: number, verified?: boolean];
const SEEDS: Seed[] = [
  ["Younglings", "The best and also the biggest clan in RuneScape!", 0xd4af37, ["PVM", "SOCIAL", "EVENTS"], "OPEN", 69, 302_226_539, true],
  ["Zamorak's Legion", "Daily bossing, weekly raids, zero judgement.", 0xb3261e, ["PVM", "COMPETITIVE"], "OPEN", 142, 288_410_000, true],
  ["Wilderness Wolves", "A pack that hunts together. PK and PvM trips every weekend.", 0x4b6cb7, ["PVM", "COMPETITIVE"], "INVITE_ONLY", 88, 251_904_120, true],
  ["Skillers Anonymous", "Chill grinders. We celebrate 99s like world cups.", 0x2e9e6b, ["SKILLING", "CASUAL", "NEW_PLAYERS"], "OPEN", 57, 244_118_330, true],
  ["Ironclad Order", "Ironmen helping ironmen: gear lists, shared knowledge, group bossing.", 0x8a8f98, ["IRONMAN", "PVM"], "OPEN", 64, 201_773_900, true],
  ["Tea & Slayer", "Cosy slayer duo-and-trio culture with a lot of tea.", 0xc77dff, ["SOCIAL", "CASUAL"], "OPEN", 31, 96_540_210],
  ["Daily Dungeoneers", "Dungeoneering parties every evening, all levels welcome.", 0xe07a1f, ["SKILLING", "EVENTS", "NEW_PLAYERS"], "OPEN", 45, 112_660_000, true],
  ["Nex Appeal", "Learn Nex and Angel of Death with patient teachers.", 0xe63e8a, ["PVM", "NEW_PLAYERS"], "OPEN", 52, 178_204_880, true],
  ["The Grand Exchange Guild", "Flippers, merchants and market nerds. Weekly price talk.", 0xf2c94c, ["SOCIAL", "COMPETITIVE"], "CLOSED", 120, 74_990_000],
  ["Citadel Climbers", "We push the clan citadel to the top every single week.", 0x00a3a3, ["EVENTS", "COMPETITIVE"], "INVITE_ONLY", 96, 266_030_500, true],
  ["Lumbridge Locals", "Friendly beginners' clan. Ask anything, nobody gets laughed at.", null, ["NEW_PLAYERS", "CASUAL", "SOCIAL"], "OPEN", 28, 18_220_400],
  ["Void Knights", "Quiet, competent, and very well-geared.", null, ["PVM", "IRONMAN"], "CLOSED", 40, 131_000_000],
  ["Bingo Brigade", "Bingo night every Friday, with prizes that actually matter.", null, ["EVENTS", "SOCIAL"], "OPEN", 73, 88_104_350, true],
  ["Dragonkin Dawn", "Raids and endgame PvM with a strict but fair schedule.", 0x6f42c1, ["PVM", "COMPETITIVE"], "INVITE_ONLY", 36, 150_990_000],
];

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const summaries: ClanSummary[] = SEEDS.map(([name, tagline, colour, focus, rec, members, , verified]) => ({
  slug: slugOf(name),
  name,
  tagline,
  logoUrl: null,
  colour,
  focus: focus.map((f) => FOCUS[f]),
  recruiting: REC[rec],
  clanName: name,
  verified: verified ?? false,
  listed: true,
  memberCount: members,
  onLeaderboards: true,
}));

export const demoClans = (): ClanSummary[] => summaries;

/** Demo alliances: the first three clans are in "The Coalition" and show it, the fourth says it has no allies, the fifth keeps quiet (shows nothing at all). */
function demoAlliances(slug: string): ClanAlliances | null {
  const group = summaries.slice(0, 3);
  const mark = (c: ClanSummary) => ({ slug: c.slug, name: c.name, logoUrl: c.logoUrl, colour: c.colour });
  if (group.some((c) => c.slug === slug)) {
    return { mode: "LIST", alliances: [{ id: "1", name: "The Coalition", hasPage: true, clans: group.filter((c) => c.slug !== slug).map(mark) }] };
  }
  return summaries[3]?.slug === slug ? { mode: "NONE", alliances: [] } : null;
}

export function demoAlliance(id: string): AlliancePage | undefined {
  if (id !== "1") return undefined;
  return { id, name: "The Coalition", clans: summaries.slice(0, 3).map((c) => ({ slug: c.slug, name: c.name, tagline: c.tagline, logoUrl: c.logoUrl, colour: c.colour })) };
}

export function demoClan(slug: string): ClanDetail | undefined {
  const base = summaries.find((c) => c.slug === slug);
  if (!base) return undefined;
  return {
    ...base,
    alliances: demoAlliances(slug),
    description: `${base.name} is a RuneScape 3 clan built around ${base.focus.map((f) => f.label.toLowerCase()).join(", ")}.\n\nWe meet on Discord every evening, run weekly events, and keep a friendly, no-pressure atmosphere. New members are given a buddy for their first two weeks.`,
    requirements: "Be active at least a few times a week. Be kind. Have Discord and be willing to join voice for events.",
    applyUrl: "https://discord.gg/example",
    timezone: "Europe/London",
    updatedAt: "2026-10-18T10:00:00Z",
    recruitingPost:
      base.recruiting.key === "CLOSED"
        ? { post: "", applyFormPath: null, inviteUrl: null }
        : {
            post: "We're looking for players who want to learn group bossing, and skillers who enjoy our weekly competitions. Any combat level is welcome.",
            applyFormPath: "/forms/1/1",
            inviteUrl: "https://discord.gg/example",
          },
  };
}

export function demoEvents(): HubEvent[] {
  const now = Date.now();
  const mk = (i: number, clanIdx: number, name: string, offsetHours: number, location: string, interested: number, active = false): HubEvent => {
    const c = summaries[clanIdx];
    return {
      id: String(i),
      name,
      description: null,
      imageUrl: null,
      location,
      status: active ? "ACTIVE" : "SCHEDULED",
      startTime: new Date(now + offsetHours * 3600 * 1000).toISOString(),
      endTime: null,
      interestedCount: interested,
      url: "https://discord.com",
      clan: { slug: c.slug, name: c.name, logoUrl: null, colour: c.colour },
    };
  };
  return [
    mk(1, 12, "Friday Night Bingo", -1, "Discord voice", 41, true),
    mk(2, 1, "Vorago hard-mode learners", 5, "World 84", 18),
    mk(3, 6, "Dungeoneering party hour", 8, "Daemonheim", 12),
    mk(4, 0, "Clan meeting + Q&A", 20, "Discord stage", 33),
    mk(5, 7, "Nex: Angel of Death teaching", 27, "Ancient Prison", 22),
    mk(6, 9, "Citadel push: Saturday sprint", 50, "Clan citadel", 56),
    mk(7, 3, "Skilling Sunday: 99 Divination", 74, "Discord voice", 15),
    mk(8, 4, "Ironman group boss night", 98, "World 22", 9),
    mk(9, 2, "Wilderness trip", 121, "Edgeville", 27),
    mk(10, 12, "Bingo: Hall of Fame edition", 150, "Discord voice", 64),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function demoClanEvents(slug: string): HubEvent[] {
  return demoEvents().filter((e) => e.clan?.slug === slug);
}

export function demoLeaderboard(period: "week" | "month"): LeaderboardEntry[] {
  const factor = period === "month" ? 4.1 : 1;
  return SEEDS.map((s, i) => ({
    slug: slugOf(s[0]),
    name: s[0],
    logoUrl: null,
    colour: s[2],
    members: s[5],
    xpGained: Math.round(s[6] * factor * (1 + ((i * 7) % 5) / 100)),
  }))
    .sort((a, b) => b.xpGained - a.xpGained)
    .map((e, i) => ({ ...e, rank: i + 1, perMember: Math.round(e.xpGained / e.members) }));
}
