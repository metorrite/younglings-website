import { BOSS_NAMES, ITEM_NAMES } from "@/lib/activityIcons.generated";
import { SKILL_NAMES, type ActivityKind } from "@/lib/site";

/**
 * The picture for a line of clan activity. These are the same pictures JonnyBot posts its tracking messages with: the skill icons in /skills, the
 * activity icons in /tracking (copied from the bot's own images), a boss's picture in /bosses, and a dropped item's icon in /items. The lists of
 * boss and item names come from the bot's tools/boss_icons.py, so a boss or item has one picture in both places.
 */
export type ActivityPicture = { kind: "skill"; name: string } | { kind: "image"; src: string };

/** The bot's icon for each kind of activity that isn't about a skill; a boss kill or a drop uses these only when it can't find the boss or item. */
const KIND_IMAGES: Partial<Record<ActivityKind, string>> = {
  QUEST: "/tracking/quest.png",
  CLUE: "/tracking/clue.png",
  CITADEL_CAP: "/tracking/citadel.png",
  CHALLENGE: "/tracking/runescore.png",
  BOSS: "/tracking/default_boss.png",
  DROP: "/tracking/default_drop.png",
  PET: "/tracking/default_boss.png",
};

/** The picture shown beside a kind in the activity filter, when it has one. Level-ups, milestones and pets have none of their own (they show a skill's icon). */
export function kindImage(kind: ActivityKind): string | undefined {
  return kind === "PET" ? undefined : KIND_IMAGES[kind];
}

const isLetter = (ch: string | undefined) => ch !== undefined && /[A-Za-z0-9]/.test(ch);

/** Whether `name` appears in `text` as a whole word or phrase ("Ash" isn't found in "Ashes", but "Arch-Glacor" is found in "Arch-Glacors"). */
function mentions(text: string, name: string): boolean {
  let from = 0;
  for (;;) {
    const at = text.indexOf(name, from);
    if (at < 0) return false;
    // a plural or possessive straight after the name is still the name; another letter before it, or a different word after, is not
    const before = text[at - 1];
    const after = text[at + name.length];
    const endsCleanly = !isLetter(after) || after === "s" || after === "'" ;
    if (!isLetter(before) && endsCleanly) return true;
    from = at + 1;
  }
}

function bossPicture(text: string): string | null {
  const hit = BOSS_NAMES.find(([name]) => mentions(text, name));
  return hit ? `/bosses/${hit[1]}.png` : null;
}

function itemPicture(text: string): string | null {
  const hit = ITEM_NAMES.find(([name]) => mentions(text, name));
  return hit ? `/items/${hit[1]}.png` : null;
}

function skillIn(text: string): string | null {
  const named = text.match(/the ([A-Za-z]+) pet/i)?.[1];
  return named && SKILL_NAMES.some((s) => s.toLowerCase() === named.toLowerCase()) ? named : null;
}

/** What to show for this line of activity. {@code skill} is the skill a level-up or milestone is about, when the caller already worked it out. */
export function activityPicture(kind: ActivityKind, text: string, skill: string | null): ActivityPicture | null {
  if (skill) return { kind: "skill", name: skill };

  if (kind === "BOSS") return { kind: "image", src: bossPicture(text) ?? KIND_IMAGES.BOSS! };
  if (kind === "DROP") return { kind: "image", src: itemPicture(text) ?? KIND_IMAGES.DROP! };
  if (kind === "PET") {
    const skillPet = skillIn(text);
    if (skillPet) return { kind: "skill", name: skillPet };
    return { kind: "image", src: bossPicture(text) ?? KIND_IMAGES.PET! };
  }
  const src = KIND_IMAGES[kind];
  return src ? { kind: "image", src } : null;
}
