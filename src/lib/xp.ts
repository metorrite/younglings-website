/**
 * RuneScape 3 experience tables and level caps, for the skill progress bars. The tables are the wiki's own
 * (Experience/Table): regular skills run to virtual level 126 (200M XP), and Invention — an elite skill — has its own,
 * gentler curve to 150. Index 0 is level 1.
 *
 * Level caps are the real, non-virtual ones, taken from what the clan's members actually show on RuneMetrics: a
 * capped skill's level stops rising while its XP keeps growing. Past its cap a skill only gains "virtual" levels.
 */

/** XP needed for each regular-skill level, 1 to 126. */
const STANDARD = [
  0, 83, 174, 276, 388, 512, 650, 801,
  969, 1154, 1358, 1584, 1833, 2107, 2411, 2746,
  3115, 3523, 3973, 4470, 5018, 5624, 6291, 7028,
  7842, 8740, 9730, 10824, 12031, 13363, 14833, 16456,
  18247, 20224, 22406, 24815, 27473, 30408, 33648, 37224,
  41171, 45529, 50339, 55649, 61512, 67983, 75127, 83014,
  91721, 101333, 111945, 123660, 136594, 150872, 166636, 184040,
  203254, 224466, 247886, 273742, 302288, 333804, 368599, 407015,
  449428, 496254, 547953, 605032, 668051, 737627, 814445, 899257,
  992895, 1096278, 1210421, 1336443, 1475581, 1629200, 1798808, 1986068,
  2192818, 2421087, 2673114, 2951373, 3258594, 3597792, 3972294, 4385776,
  4842295, 5346332, 5902831, 6517253, 7195629, 7944614, 8771558, 9684577,
  10692629, 11805606, 13034431, 14391160, 15889109, 17542976, 19368992, 21385073,
  23611006, 26068632, 28782069, 31777943, 35085654, 38737661, 42769801, 47221641,
  52136869, 57563718, 63555443, 70170840, 77474828, 85539082, 94442737, 104273167,
  115126838, 127110260, 140341028, 154948977, 171077457, 188884740,
];

/** XP needed for each elite-skill (Invention) level, 1 to 150. */
const ELITE = [
  0, 830, 1861, 2902, 3980, 5126, 6380, 7787,
  9400, 11275, 13605, 16372, 19656, 23546, 28134, 33520,
  39809, 47109, 55535, 65209, 77190, 90811, 106221, 123573,
  143025, 164742, 188893, 215651, 245196, 277713, 316311, 358547,
  404634, 454796, 509259, 568254, 632019, 700797, 774834, 854383,
  946227, 1044569, 1149696, 1261903, 1381488, 1508756, 1644015, 1787581,
  1939773, 2100917, 2283490, 2476369, 2679917, 2894505, 3120508, 3358307,
  3608290, 3870846, 4146374, 4435275, 4758122, 5096111, 5449685, 5819299,
  6205407, 6608473, 7028964, 7467354, 7924122, 8399751, 8925664, 9472665,
  10041285, 10632061, 11245538, 11882262, 12542789, 13227679, 13937496, 14672812,
  15478994, 16313404, 17176661, 18069395, 18992239, 19945833, 20930821, 21947856,
  22997593, 24080695, 25259906, 26475754, 27728955, 29020233, 30350318, 31719944,
  33129852, 34580790, 36073511, 37608773, 39270442, 40978509, 42733789, 44537107,
  46389292, 48291180, 50243611, 52247435, 54303504, 56412678, 58575824, 60793812,
  63067521, 65397835, 67785643, 70231841, 72737330, 75303019, 77929820, 80618654,
  83370445, 86186124, 89066630, 92012904, 95025896, 98106559, 101255855, 104474750,
  107764216, 111125230, 114558777, 118065845, 121647430, 125304532, 129038159, 132849323,
  136739041, 140708338, 144758242, 148889790, 153104021, 157401983, 161784728, 166253312,
  170808801, 175452262, 180184770, 185007406, 189921255, 194927409,
];

const INVENTION = 26;
export const MAX_XP = 200_000_000;
export const SKILL_COUNT = 29;
/** Everything maxed: 29 skills at 200M each. */
export const MAX_TOTAL_XP = SKILL_COUNT * MAX_XP;

/** Skills whose real level stops at 99 (everything not listed here is 120, apart from the 110 group). */
const CAP_99 = new Set([1, 3, 5, 7, 10, 16, 23, 25]); // Defence, Constitution, Prayer, Cooking, Fishing, Agility, Summoning, Divination
const CAP_110 = new Set([8, 9, 11, 12, 13, 14, 20, 21]); // Woodcutting, Fletching, Firemaking, Crafting, Smithing, Mining, Runecrafting, Hunter

/** The highest real (non-virtual) level a skill can reach: 99, 110 or 120. */
export function realCap(skillId: number): 99 | 110 | 120 {
  return CAP_99.has(skillId) ? 99 : CAP_110.has(skillId) ? 110 : 120;
}

const tableFor = (skillId: number) => (skillId === INVENTION ? ELITE : STANDARD);

/** XP at which a skill reaches `level` (clamped to the table). */
export function xpForLevel(skillId: number, level: number): number {
  const table = tableFor(skillId);
  return table[Math.max(1, Math.min(level, table.length)) - 1];
}

/** The level an amount of XP is worth if virtual levels count — up to 126, or 150 for Invention. */
export function virtualLevel(skillId: number, xp: number): number {
  const table = tableFor(skillId);
  let level = 1;
  while (level < table.length && xp >= table[level]) level++;
  return level;
}

/** The level RuneScape shows: virtual levels stop at the skill's cap. */
export function realLevel(skillId: number, xp: number): number {
  return Math.min(virtualLevel(skillId, xp), realCap(skillId));
}

export interface Milestone {
  label: string;
  xp: number;
  /** Beyond the skill's real level cap, so only a virtual level. */
  virtual: boolean;
}

/**
 * The goals a skill works through, in order. Each is measured from zero XP, so a member who has just reached 99 is
 * about a third of the way to 110 (13M of 38.7M), not at the start of a new bar. After the real cap the next goal
 * is virtual 120, and after 120 it is 200M XP.
 */
export function milestones(skillId: number): Milestone[] {
  const cap = realCap(skillId);
  const list: Milestone[] = [{ label: "Level 99", xp: xpForLevel(skillId, 99), virtual: false }];
  if (cap >= 110) list.push({ label: "Level 110", xp: xpForLevel(skillId, 110), virtual: false });
  list.push({ label: cap === 120 ? "Level 120" : "Level 120 (virtual)", xp: xpForLevel(skillId, 120), virtual: cap < 120 });
  list.push({ label: "200M XP", xp: MAX_XP, virtual: false });
  return list;
}

export interface Progress {
  /** The milestone being worked towards, or null once the skill is maxed at 200M XP. */
  target: Milestone | null;
  /** 0 to 1 of the way there, measured from zero XP. */
  fraction: number;
  /** Which bar this is (0 = towards 99), for colouring. */
  stage: number;
  remaining: number;
}

export function progressFor(skillId: number, xp: number): Progress {
  const all = milestones(skillId);
  const stage = all.findIndex((m) => xp < m.xp);
  if (stage === -1) return { target: null, fraction: 1, stage: all.length - 1, remaining: 0 };
  return { target: all[stage], fraction: Math.max(0, xp / all[stage].xp), stage, remaining: all[stage].xp - xp };
}
