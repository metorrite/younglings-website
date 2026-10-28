import type { SpaceChannel, SpaceDraft, SpaceGrant, SpaceSettings, SpaceSlot, SpaceView } from "@/lib/eventTypes";

/** The draft that says what the saved settings say: the slots an organiser chose and the patterns that differ from the defaults. */
export function draftOf(s: SpaceSettings): SpaceDraft {
  const slots: SpaceDraft["slots"] = {};
  for (const slot of s.slots) {
    if (slot.explicit && slot.applies) slots[slot.key] = slot.use === "existing" && slot.channelId ? { use: "existing", channelId: slot.channelId } : { use: slot.use };
  }
  const names: Record<string, string> = {};
  for (const slot of s.slots) if (slot.pattern !== slot.defaultPattern) names[slot.key] = slot.pattern;
  for (const name of s.names) if (name.pattern !== name.defaultPattern) names[name.key] = name.pattern;
  const draft: SpaceDraft = { enabled: s.enabled, teamChannels: s.teamChannels, playerChannels: s.playerChannels, slots, names };
  if (s.welcome && Object.keys(s.welcome).length > 0) draft.welcome = { ...s.welcome };
  return draft;
}

/** The kinds of channel that can have a welcome message, in the order the page shows them. */
export const WELCOME_KINDS: { key: string; label: string; teamOnly?: boolean; soloOnly?: boolean }[] = [
  { key: "announcements", label: "Announcements" },
  { key: "general", label: "General chat" },
  { key: "teamChannel", label: "Each team's channel", teamOnly: true },
  { key: "playerChannel", label: "Each player's channel", soloOnly: true },
];

/** The draft with the welcome message for one kind of channel set (an empty text removes it). */
export function withWelcome(draft: SpaceDraft, key: string, text: string): SpaceDraft {
  const welcome = { ...(draft.welcome ?? {}) };
  if (text.trim() === "") delete welcome[key];
  else welcome[key] = text;
  const next: SpaceDraft = { ...draft };
  if (Object.keys(welcome).length > 0) next.welcome = welcome;
  else delete next.welcome;
  return next;
}

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sorted(v)]),
    );
  }
  return value;
}

/** Whether two drafts say the same thing, whatever order their keys are in. */
export function sameDraft(a: SpaceDraft, b: SpaceDraft): boolean {
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
}

/** How a single channel is provided right now: the organiser's choice in the draft, else what the page was told (the default, or a channel the event already names). */
export function effectiveUse(slot: SpaceSlot, draft: SpaceDraft): { use: SpaceSlot["use"]; channelId: string | null } {
  const own = draft.slots[slot.key];
  return own ? { use: own.use, channelId: own.channelId ?? null } : { use: slot.use, channelId: slot.channelId };
}

/** The pattern a name has in the draft: the organiser's, else the default. */
export function patternOf(key: string, fallback: string, draft: SpaceDraft): string {
  return draft.names[key] ?? fallback;
}

/** The draft with one pattern changed; a pattern put back to the default is dropped, so only real changes are kept. */
export function withPattern(draft: SpaceDraft, key: string, value: string, defaultPattern: string): SpaceDraft {
  const names = { ...draft.names };
  if (value === defaultPattern) delete names[key];
  else names[key] = value;
  return { ...draft, names };
}

/** The draft with a channel provided in another way. */
export function withUse(draft: SpaceDraft, key: string, use: SpaceSlot["use"], channelId: string | null): SpaceDraft {
  return { ...draft, slots: { ...draft.slots, [key]: use === "existing" && channelId ? { use, channelId } : { use } } };
}

const READ_WRITE = { read: "can read it", chat: "can read and write in it", manage: "can manage it" } as const;

/** Who can do what in a channel, in a sentence. Everyone not mentioned can't see it. */
export function accessLine(access: SpaceGrant[]): string {
  if (access.length === 0) return "Who can see it stays as it is.";
  const level = (who: SpaceGrant["who"]) => access.find((g) => g.who === who)?.level;
  const parts: string[] = [];
  const players = level("participants");
  if (players === "read" || players === "chat") parts.push(`Players ${READ_WRITE[players]}`);
  if (level("team") === "chat") parts.push("The team can read and write in it");
  if (level("player") === "chat") parts.push("Only that player can read and write in it");
  parts.push("Organisers and staff can manage it");
  return parts.join(". ") + ". Nobody else can see it.";
}

export interface SpaceGroup {
  key: string;
  title: string;
  category: SpaceChannel | null;
  channels: SpaceChannel[];
}

/** The channels of a plan grouped under their categories, then the channels that already existed, then those no longer wanted. */
export function groupChannels(channels: SpaceChannel[]): SpaceGroup[] {
  const groups: SpaceGroup[] = [];
  for (const category of channels.filter((c) => c.kind === "category" && c.action !== "remove")) {
    groups.push({ key: category.key, title: category.name, category, channels: channels.filter((c) => c.kind !== "category" && c.parent === category.key && c.action !== "remove") });
  }
  const existing = channels.filter((c) => c.action === "use_existing");
  if (existing.length > 0) groups.push({ key: "existing", title: "Channels that are already there", category: null, channels: existing });
  const leaving = channels.filter((c) => c.action === "remove");
  if (leaving.length > 0) groups.push({ key: "remove", title: "No longer needed", category: null, channels: leaving });
  return groups;
}

/** One line on where the roles and channels stand. */
export function stateLine(view: SpaceView): { tone: "good" | "muted" | "warn"; text: string } {
  if (!view.settings.enabled) return { tone: "muted", text: "Off" };
  if (!view.state.applied) return { tone: view.ready ? "good" : "warn", text: view.ready ? "Ready to set up" : "Not ready to set up yet" };
  return view.state.complete ? { tone: "good", text: "Set up" } : { tone: "warn", text: "Set up, but something is missing" };
}
