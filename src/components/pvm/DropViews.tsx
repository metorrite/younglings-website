import Image from "next/image";
import Link from "next/link";
import { Tip, TipBody } from "@/components/ui/Tip";
import type { DropCell, DropEntry } from "@/lib/site";

const query = (period: string | null, boss?: string | null) => {
  const parts = [period && period !== "all" ? `period=${encodeURIComponent(period)}` : null, boss ? `boss=${encodeURIComponent(boss)}` : null].filter(Boolean);
  return parts.length ? `?${parts.join("&")}` : "";
};

/** An item's inventory icon, or a neutral placeholder when we have no picture for it. */
export function ItemIcon({ icon, name, size = 36, className = "" }: { icon: string | null; name: string; size?: number; className?: string }) {
  if (!icon) {
    return (
      <span className={`flex shrink-0 items-center justify-center rounded bg-white/5 text-xs text-muted ${className}`} style={{ width: size, height: size }} aria-hidden>
        {name.slice(0, 1)}
      </span>
    );
  }
  return <Image src={icon} alt="" width={size} height={size} unoptimized className={`shrink-0 object-contain ${className}`} style={{ width: size, height: size }} />;
}

/**
 * The drop log as a grid of square tiles, in the style of the game's own collection log: every item a boss (or the
 * chosen bosses) can drop, greyed out while the clan hasn't received it, and in full colour with a count once it has.
 * A dotted outline marks items the adventure log doesn't report yet; they can only read zero until richer data exists.
 */
export function DropGrid({ cells, period, boss, size = 52 }: { cells: DropCell[]; period: string | null; boss?: string | null; size?: number }) {
  if (cells.length === 0) return <p className="text-sm text-muted">No drop table is on file for this selection yet.</p>;
  const obtained = cells.filter((c) => c.count > 0).length;

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        <span className="font-semibold text-foreground">{obtained}</span> of {cells.length} items obtained
        {cells.some((c) => !c.tracked) && <span className="ml-2 text-xs">· dotted tiles aren&apos;t reported by the adventure log yet</span>}
      </p>
      <ul className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size + 12}px, 1fr))` }}>
        {cells.map((cell) => {
          const got = cell.count > 0;
          return (
            <li key={cell.key}>
              <Tip
                content={
                  <TipBody
                    icon={<ItemIcon icon={cell.icon} name={cell.item} size={22} />}
                    title={cell.item}
                    rows={[
                      ...(cell.rarity ? ([["Drop rate", cell.rarity]] as [string, string][]) : []),
                      got ? ["Received", `${cell.count}×${cell.receivers > 1 ? ` by ${cell.receivers} members` : ""}`] : ["Status", cell.tracked ? "Not received yet" : "Not reported by the log"],
                      ...(cell.top.length > 0 ? ([["Most", `${cell.top[0].rsn} (${cell.top[0].count})`]] as [string, string][]) : []),
                    ]}
                  />
                }
              >
              <Link
                href={`/pvm/item/${cell.key}${query(period, boss)}`}
                className={`relative flex aspect-square items-center justify-center rounded-lg border bg-background/50 transition hover:border-gold/60 hover:bg-gold/5 ${got ? "border-gold/40" : cell.tracked ? "border-surface-border/60" : "border-dashed border-surface-border/60"}`}
              >
                <ItemIcon icon={cell.icon} name={cell.item} size={size - 12} className={got ? "" : "opacity-30 grayscale"} />
                {got && <span className="absolute right-0.5 bottom-0.5 rounded bg-background/90 px-1 text-[11px] leading-tight font-bold text-gold tabular-nums">{cell.count}</span>}
              </Link>
              </Tip>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The drops themselves, newest first: who got what, from which boss, and when. */
export function DropList({ entries, showBoss = true, empty = "No drops recorded in this window." }: { entries: DropEntry[]; showBoss?: boolean; empty?: string }) {
  if (entries.length === 0) return <p className="py-4 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-surface-border/60">
      {entries.map((d, i) => (
        <li key={`${d.rsn}-${d.recordedAt}-${d.key}-${i}`} className="flex items-center gap-3 py-2 text-sm">
          <ItemIcon icon={d.icon} name={d.item} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate">
              <Link href={`/pvm/item/${d.key}`} className="font-medium hover:text-gold">
                {d.item}
              </Link>{" "}
              <span className="text-muted">·</span>{" "}
              <Link href={`/members/${encodeURIComponent(d.rsn)}`} className="hover:text-gold">
                {d.rsn}
              </Link>
            </p>
            {showBoss && (
              <p className="truncate text-xs text-muted">
                {d.boss ? (
                  <Link href={`/pvm/${d.boss.key}`} className="hover:text-gold">
                    {d.boss.name}
                  </Link>
                ) : (
                  "Source unknown"
                )}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted">{d.date}</span>
        </li>
      ))}
    </ul>
  );
}
