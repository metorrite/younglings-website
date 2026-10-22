/**
 * The event setup's options as the bot describes them (`events/setup/schema/{kind}`), and the few pure rules the setup screens need to read them the
 * same way the bot does: where an answer lives, whether an option is shown or required, and what is still missing. The bot checks everything again when an
 * event is made; this only keeps the screens in step while someone fills them in.
 */

/** The answers to the options: one nested object shaped like the body that creates an event, plus `prizes`. */
import type { EventPrize } from "@/lib/eventTypes";

export type Answers = { [key: string]: unknown };

export type OptionType = "TEXT" | "TEXTAREA" | "INT" | "BOOL" | "CHOICE" | "DATETIME" | "CHANNEL" | "PRIZES";

export interface OptionChoice {
  value: string;
  label: string;
  hint: string;
}

/** "This other answer is set" (`set`) or "has this value" (`value`), turned round by `negate`. */
export interface OptionCondition {
  path: string;
  value?: string | number | boolean;
  set?: boolean;
  negate: boolean;
}

export interface OptionDef {
  /** Where the answer lives in the answers, like `config.buyIn.amount`. */
  path: string;
  label: string;
  hint: string;
  step: string;
  type: OptionType;
  /** A special control to use instead of the plain one for the type: `look`, `shape`, `skill`. */
  widget: string | null;
  standard: unknown;
  required: { always: boolean; when?: OptionCondition };
  showWhen: OptionCondition | null;
  choices: OptionChoice[];
  min: number | null;
  max: number | null;
  maxLength: number | null;
  /** Asked in the quick setup. */
  quick: boolean;
  /** The stored value is a number (an INT, or a choice whose values are numbers). */
  numeric: boolean;
}

export interface SetupStep {
  key: string;
  label: string;
  blurb: string;
}

export interface OptionSchema {
  template: string;
  label: string;
  description: string;
  steps: SetupStep[];
  options: OptionDef[];
  /** The standard answers made at the moment the schema was asked for: a name, a start a day from now, a week long, and every option at its standard value. */
  standard: Answers;
  startsInHours: number;
  days: number;
}

export interface MissingAnswer {
  path: string;
  label: string;
  step: string;
  message: string;
}

/** An unfinished setup kept on the server. `answers` and `missing` come only when one draft is asked for. */
export interface EventDraft {
  id: string;
  template: string;
  templateLabel: string;
  stream: string;
  step: string;
  title: string;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  missingCount: number;
  answers?: Answers;
  missing?: MissingAnswer[];
}

/** A setup kept under a name, to make similar events from. */
export interface SavedTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  templateLabel: string;
  /** False when the kind of event it was made for no longer exists. */
  available: boolean;
  scoringMode: "INDIVIDUAL" | "TEAM";
  days: number;
  prizes: number;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
}

/** A kind of event an admin can start (the bot's `events/templates`). */
export interface EventKind {
  key: string;
  label: string;
  description: string;
}

export const MIN_NAME = 3;

// ---------- reading and writing answers by path ----------

export function getPath(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Answers)[part];
  }
  return current === null ? undefined : current;
}

/** The answers with `value` at `path`; an undefined value removes it (and any object that leaves empty is kept, which the bot ignores). The input is not changed. */
export function setPath(root: Answers, path: string, value: unknown): Answers {
  const [head, ...rest] = path.split(".");
  const next: Answers = { ...root };
  if (rest.length === 0) {
    if (value === undefined) delete next[head];
    else next[head] = value;
    return next;
  }
  const child = root[head];
  const base: Answers = child !== null && typeof child === "object" && !Array.isArray(child) ? (child as Answers) : {};
  if (value === undefined && !(head in root)) return root;
  next[head] = setPath(base, rest.join("."), value);
  return next;
}

// ---------- conditions, requirements, what is missing ----------

function blank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

export function holds(cond: OptionCondition, answers: Answers): boolean {
  const actual = getPath(answers, cond.path);
  let matches: boolean;
  if (cond.set) matches = !blank(actual);
  else if (typeof cond.value === "boolean") matches = actual === cond.value;
  else if (typeof cond.value === "number") matches = (typeof actual === "number" || (typeof actual === "string" && actual.trim() !== "")) && Number(actual) === cond.value;
  else matches = actual !== undefined && String(actual).toLowerCase() === String(cond.value).toLowerCase();
  return cond.negate ? !matches : matches;
}

export function isShown(opt: OptionDef, answers: Answers): boolean {
  return opt.showWhen === null || holds(opt.showWhen, answers);
}

export function isRequired(opt: OptionDef, answers: Answers): boolean {
  return opt.required.always || (opt.required.when !== undefined && holds(opt.required.when, answers));
}

export function isFilled(opt: OptionDef, value: unknown): boolean {
  if (value === undefined || value === null) return false;
  switch (opt.type) {
    case "INT": {
      const n = typeof value === "number" ? value : typeof value === "string" && /^-?\d{1,15}$/.test(value.trim()) ? Number(value) : NaN;
      return Number.isFinite(n) && (opt.min === null || n >= opt.min);
    }
    case "BOOL":
      return typeof value === "boolean";
    case "PRIZES":
      return Array.isArray(value) && value.length > 0;
    case "CHOICE":
      return opt.numeric ? typeof value === "number" : String(value).trim() !== "";
    default:
      return String(value).trim() !== "";
  }
}

function missingMessage(opt: OptionDef): string {
  if (opt.path === "name") return `Give the event a name of at least ${MIN_NAME} characters.`;
  if (opt.path === "config.buyIn.amount") return "Say how much the buy-in is.";
  if (opt.path === "config.signupChannelId" || opt.path === "config.signupAdminChannelId") return "A signup needs both a public channel and a staff channel, or neither.";
  return `Fill in "${opt.label}".`;
}

/**
 * What the bot would refuse about the prizes, for the plain mistakes (the bot checks all of it again): a prize with nothing said about it, a share of a pot
 * there isn't, shares that add up to more than the pot.
 */
function prizeProblems(opt: OptionDef, answers: Answers): MissingAnswer[] {
  const prizes = Array.isArray(answers.prizes) ? (answers.prizes as Partial<EventPrize>[]) : [];
  const buyIn = getPath(answers, "config.buyIn.enabled") === true;
  const problems: MissingAnswer[] = [];
  const add = (message: string) => problems.push({ path: opt.path, label: opt.label, step: opt.step, message });
  let promised = 0;
  prizes.forEach((p, i) => {
    const n = i + 1;
    if (p.kind === "CLAN_POINTS") {
      if (!((p.amount ?? 0) >= 1)) add(`Prize ${n}: give the clan points a number above zero.`);
    } else if (!p.description || p.description.trim() === "") add(`Prize ${n}: describe it, for example "Zaros godsword" or "50M gp".`);
    if ((p.percentOfPot ?? 0) > 0) {
      if (!buyIn) add(`Prize ${n}: a share of the pot needs a buy-in.`);
      promised += (p.percentOfPot ?? 0) * Math.max(1, (p.placeTo ?? p.place ?? 1) - (p.place ?? 1) + 1);
    }
  });
  if (promised > 10_000) add("The prizes promise more than the whole pot between them.");
  return problems;
}

/** The required options that are shown and have no answer yet, and the plain mistakes in the prizes, in the order of the setup. */
export function missingAnswers(schema: OptionSchema, answers: Answers): MissingAnswer[] {
  const missing: MissingAnswer[] = [];
  for (const opt of schema.options) {
    if (!isShown(opt, answers)) continue;
    if (opt.type === "PRIZES") missing.push(...prizeProblems(opt, answers));
    if (!isRequired(opt, answers)) continue;
    if (!isFilled(opt, getPath(answers, opt.path))) missing.push({ path: opt.path, label: opt.label, step: opt.step, message: missingMessage(opt) });
  }
  return missing;
}

/** The steps of the guided setup that have something to ask for this kind of event (a custom event has no rules to set, for one). */
export function guidedSteps(schema: OptionSchema): SetupStep[] {
  return schema.steps.filter((s) => schema.options.some((o) => o.step === s.key));
}

/** The options of one step that are shown given the answers so far. */
export function stepOptions(schema: OptionSchema, stepKey: string, answers: Answers): OptionDef[] {
  return schema.options.filter((o) => o.step === stepKey && isShown(o, answers));
}

// ---------- dates ----------

const pad = (n: number) => String(n).padStart(2, "0");

/** An ISO date and time as the local `datetime-local` input wants it (empty when there is none or it can't be read). */
export function isoToLocalInput(iso: unknown): string {
  if (typeof iso !== "string" || iso === "") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** What the local `datetime-local` input holds, as an ISO date and time (undefined when it is empty or can't be read). */
export function localInputToIso(local: string): string | undefined {
  if (local === "") return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// ---------- a summary of the answers, in words ----------

/**
 * A date and time in words. {@code local} is the viewer's own time zone (what the date inputs show); without it the time is UTC, which is what the server can
 * render, so a page can show UTC while it is rendered on the server and switch to local once it is in the browser (see useIsClient).
 */
const when = (iso: unknown, local: boolean) => {
  if (typeof iso !== "string" || iso === "") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (!local) return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  return d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const num = (n: unknown): string => (typeof n === "number" ? n.toLocaleString("en-GB") : String(n ?? ""));

/** The choice's label for the answer at `path`, or the raw answer. */
export function choiceLabel(schema: OptionSchema, path: string, answers: Answers): string {
  const opt = schema.options.find((o) => o.path === path);
  const value = getPath(answers, path);
  if (!opt || value === undefined) return "";
  return opt.choices.find((c) => c.value === String(value))?.label ?? String(value);
}

/** One answer in words, for the review before an event is made ("Not set" when there is none). */
export function answerText(opt: OptionDef, answers: Answers, channelName: (id: string) => string, local = true): string {
  const value = getPath(answers, opt.path);
  if (value === undefined || (typeof value === "string" && value.trim() === "")) return "Not set";
  switch (opt.type) {
    case "BOOL":
      return value === true ? "Yes" : "No";
    case "INT":
      if (opt.path === "maxParticipants" && Number(value) === 0) return "No limit";
      return typeof value === "number" ? value.toLocaleString("en-GB") : String(value);
    case "DATETIME":
      return when(value, local) ?? "Not set";
    case "CHANNEL":
      return `#${channelName(String(value))}`;
    case "PRIZES":
      return Array.isArray(value) ? `${value.length} prize${value.length === 1 ? "" : "s"}` : "Not set";
    case "CHOICE":
      return opt.choices.find((c) => c.value === String(value))?.label ?? String(value);
    default:
      return String(value);
  }
}

/** What the answers add up to, a line each, for the panel that updates as the setup is filled in. */
export function summaryLines(schema: OptionSchema, answers: Answers, channelName: (id: string) => string, local = true): { label: string; text: string }[] {
  const lines: { label: string; text: string }[] = [];
  const starts = when(answers.startsAt, local);
  const ends = when(answers.endsAt, local);
  lines.push({ label: "When", text: starts ? `Starts ${starts}${ends ? `, ends ${ends}` : ""}` : "No start planned" });
  const solo = answers.scoringMode !== "TEAM";
  const max = Number(answers.maxParticipants ?? 0);
  lines.push({ label: "Players", text: `${solo ? "Solo players" : "Teams"} · ${choiceLabel(schema, "scope", answers) || "Clan only"} · ${max > 0 ? `up to ${max}` : "no player limit"}` });

  const rules: string[] = [];
  // a clan-vs-clan event: what the clans play and how they are scored, then that game's own rules (T-222)
  const clanVsClan = schema.template === "clan-vs-clan";
  const game = clanVsClan ? String(getPath(answers, "config.cvcGame") ?? "bingo") : schema.template;
  if (clanVsClan) rules.push(`Clans play: ${choiceLabel(schema, "config.cvcGame", answers) || "Bingo"}`, `scored by ${(choiceLabel(schema, "config.cvc.scoring", answers) || "Best players").toLowerCase()}`);
  switch (game) {
    case "bingo": {
      const layout = String(getPath(answers, "config.board.layout") ?? "grid");
      const size = Number(getPath(answers, "config.board.size") ?? 5);
      rules.push(layout === "grid" || layout === "" ? `${size} × ${size} grid` : choiceLabel(schema, "config.board.layout", answers));
      rules.push(`${choiceLabel(schema, "config.board.look", answers)} look`, choiceLabel(schema, "config.board.pool", answers).toLowerCase());
      break;
    }
    case "scavenger-hunt":
      rules.push(`${num(getPath(answers, "config.steps"))} items`, `${num(getPath(answers, "config.stepPoints"))} points each`, getPath(answers, "config.ordered") ? "one after another" : "in any order");
      break;
    case "competition":
      rules.push(`${choiceLabel(schema, "config.skillId", answers)} XP`, `1 point per ${num(getPath(answers, "config.xpPerPoint"))} XP`);
      break;
    case "boss-night": {
      const boss = String(getPath(answers, "config.boss") ?? "").trim();
      rules.push(boss ? `Kill ${boss}` : "Boss not chosen yet", `${num(getPath(answers, "config.kills"))} kills count`, `${num(getPath(answers, "config.pointsPerKill"))} points each`);
      break;
    }
    default:
      rules.push("You add the objectives after it is made");
  }
  lines.push({ label: "Rules", text: rules.filter(Boolean).join(" · ") });

  const buyIn = getPath(answers, "config.buyIn.enabled") === true;
  const prizes = Array.isArray(answers.prizes) ? answers.prizes.length : 0;
  lines.push({ label: "Money", text: `${buyIn ? `Buy-in ${num(getPath(answers, "config.buyIn.amount") ?? 0)} gp` : "No buy-in"} · ${prizes > 0 ? `${prizes} prize${prizes === 1 ? "" : "s"}` : "no prizes yet"}` });

  const signup = getPath(answers, "config.signupChannelId");
  const channelsOn = getPath(answers, "config.channels.enabled") === true;
  const slot = (key: string, label: string) => {
    const use = getPath(answers, `config.channels.slots.${key}.use`);
    const id = getPath(answers, `config.channels.slots.${key}.channelId`) ?? getPath(answers, key === "board" ? "config.boardChannelId" : "config.reviewChannelId");
    if (typeof id === "string" && id && (use === undefined || use === "existing")) return `${label} in #${channelName(id)}`;
    if (channelsOn && use === "none") return "";
    return channelsOn && (use === undefined || use === "create") ? `${label} made by JonnyBot` : "";
  };
  const places = [
    typeof signup === "string" && signup ? `signup in #${channelName(signup)}` : "",
    channelsOn ? "roles and channels made by JonnyBot" : "",
    slot("board", "live board"),
    slot("review", "proof review"),
  ].filter(Boolean);
  lines.push({ label: "Discord", text: places.length > 0 ? places.join(" · ") : "No channels chosen yet" });

  const verify = getPath(answers, "config.verification.required") === true;
  lines.push({
    label: "Setup",
    text: `${getPath(answers, "config.setup.mode") === "OFF" ? "Start whenever you like" : "Follows the setup steps"}${verify ? ` · players verified ${choiceLabel(schema, "config.verification.gate", answers).toLowerCase()}` : ""}`,
  });
  return lines;
}
