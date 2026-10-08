import Image from "next/image";
import Link from "next/link";
import type { ActivityKind, FeedItem } from "@/lib/site";
import { SkillIcon } from "@/components/site/SkillIcon";
import { activityPicture, kindImage } from "@/lib/activityIcon";
import { Tip, TipBody } from "@/components/ui/Tip";
import { shortNumbers, SKILL_NAMES } from "@/lib/site";

const KIND: Record<ActivityKind, { icon: string; label: string; color: string }> = {
  LEVEL_UP: { icon: "⬆️", label: "Level up", color: "#3ecf8e" },
  XP_MILESTONE: { icon: "📈", label: "XP milestone", color: "#5aa9e6" },
  QUEST: { icon: "📜", label: "Quest", color: "#8b7cf6" },
  BOSS: { icon: "⚔️", label: "Boss kills", color: "#e0627a" },
  DROP: { icon: "🎁", label: "Drop", color: "#d4af37" },
  PET: { icon: "🐾", label: "Pet", color: "#e0a24a" },
  CITADEL_CAP: { icon: "🏰", label: "Citadel cap", color: "#d4af37" },
  CLUE: { icon: "🗺️", label: "Clue", color: "#4cc9c0" },
  CHALLENGE: { icon: "🏆", label: "Challenge", color: "#c084fc" },
};

/** Every kind with its label and colour, and its picture (the bot's) where it has one of its own. */
export const FEED_KINDS = Object.entries(KIND).map(([id, v]) => ({ id: id as ActivityKind, ...v, image: kindImage(id as ActivityKind) }));

/** A readable one-liner for an adventure-log entry, e.g. "reached 200M XP in Necromancy". */
function sentence(item: FeedItem): string {
  const text = item.text.replace(/\.$/, "");
  const milestone = text.match(/^([\d,]+)XP in (.+)$/);
  if (milestone) return `reached ${shortNumbers(`${milestone[1].replace(/,/g, "")}XP`)} in ${milestone[2]}`;
  if (item.kind === "LEVEL_UP") return text.replace(/^Levelled up/, "levelled up").replace(/^levelled up (\w+)$/i, (_m, skill) => `levelled up ${SKILL_NAMES.includes(skill) ? skill : skill}`);
  if (item.kind === "QUEST") return `completed ${text.replace(/^Quest complete: ?/, "")}`;
  if (item.kind === "CITADEL_CAP") return "capped at the Clan Citadel";
  if (item.kind === "BOSS") return text.replace(/^I (killed|defeated)/, "$1").replace(/^killed {2}/, "killed ");
  return shortNumbers(text.replace(/^I /, ""));
}

/** The skill a level-up or XP-milestone line is about, so the feed can show its icon instead of a generic one. */
function skillOf(item: FeedItem): string | null {
  const text = item.text.replace(/\.$/, "");
  const name = item.kind === "LEVEL_UP" ? text.match(/^Levelled up (\w+)$/i)?.[1] : item.kind === "XP_MILESTONE" ? text.match(/^[\d,]+XP in (.+)$/)?.[1] : undefined;
  return name && SKILL_NAMES.some((s) => s.toLowerCase() === name.toLowerCase()) ? name : null;
}

export function FeedList({ items, compact = false }: { items: FeedItem[]; compact?: boolean }) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted">Nothing to show yet.</p>;

  return (
    <ul className="divide-y divide-surface-border/60">
      {items.map((item, i) => {
        const kind = KIND[item.kind];
        const picture = activityPicture(item.kind, item.text, skillOf(item));
        return (
          <li key={`${item.rsn}-${item.recordedAt}-${i}`} className={`flex items-start gap-3 ${compact ? "py-2" : "py-3"}`}>
            <Tip content={<TipBody title={kind.label} titleColor={kind.color} />}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base" style={{ backgroundColor: `${kind.color}22` }}>
                {picture?.kind === "skill" ? (
                  <SkillIcon name={picture.name} size={22} />
                ) : picture ? (
                  <Image src={picture.src} alt="" width={22} height={22} className="shrink-0 object-contain" unoptimized />
                ) : (
                  kind.icon
                )}
              </span>
            </Tip>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <Link href={`/members/${encodeURIComponent(item.rsn)}`} className="font-semibold hover:text-gold">
                  {item.rsn}
                </Link>{" "}
                <span className="text-foreground/90">{sentence(item)}</span>
              </p>
              {!compact && item.details && <p className="mt-0.5 text-xs text-muted">{item.details}</p>}
              <p className="mt-0.5 text-[11px] text-muted/80">{item.date}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
