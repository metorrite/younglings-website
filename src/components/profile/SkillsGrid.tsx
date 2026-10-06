"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SkillIcon } from "@/components/site/SkillIcon";
import { compact, full } from "@/lib/site";
import { MAX_TOTAL_XP, MAX_XP, SKILL_COUNT, progressFor, realCap, virtualLevel, type Progress } from "@/lib/xp";

export interface SkillRow {
  id: number;
  name: string;
  level: number;
  xp: number;
  rank: number;
}

const STORAGE_KEY = "younglings.virtualLevels";
const CHANGED = "younglings:virtual-levels-changed";
/** How long you have to rest the pointer on a skill before its details appear. */
const HOVER_MS = 1500;

// Whether to show virtual levels is a per-browser choice that follows you from one member's page to the next.
const subscribe = (notify: () => void) => {
  window.addEventListener(CHANGED, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(CHANGED, notify);
    window.removeEventListener("storage", notify);
  };
};
const readVirtual = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

/** Light tones that stay clear of the gold level numbers and the skill icons' own colours. */
function barColor(target: Progress["target"]): string {
  if (!target) return "#fcd34d";
  if (target.label.startsWith("Level 99")) return "#86efac"; // light green
  if (target.label.startsWith("Level 110")) return "#7dd3fc"; // light blue
  if (target.label.startsWith("Level 120")) return "#c4b5fd"; // light violet
  return "#f9a8d4"; // pink, on the way to 200M
}

/** A progress bar: filled in the colour of its goal, and shining and sparkling once the goal is the very last one. */
function Bar({ fraction, color, maxed }: { fraction: number; color: string; maxed: boolean }) {
  return (
    <div className="relative mt-2 h-1.5 w-full rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
      <div className={`h-full rounded-full ${maxed ? "bar-maxed" : ""}`} style={{ width: `${Math.max(fraction > 0 ? 2 : 0, fraction * 100)}%`, backgroundColor: maxed ? undefined : color }} />
      {maxed && (
        <>
          <span aria-hidden className="sparkle" style={{ left: "12%", animationDelay: "0s" }}>✦</span>
          <span aria-hidden className="sparkle" style={{ left: "46%", animationDelay: "0.7s" }}>✦</span>
          <span aria-hidden className="sparkle" style={{ left: "78%", animationDelay: "1.4s" }}>✦</span>
        </>
      )}
    </div>
  );
}

function Tile({ icon, name, sub, level, virtualShown, progress, href, selected, tip }: {
  icon: string;
  name: string;
  sub: string;
  level: number;
  virtualShown: boolean;
  progress: Progress;
  href?: string;
  selected?: boolean;
  tip: React.ReactNode;
}) {
  const [showTip, setShowTip] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const arm = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShowTip(true), HOVER_MS);
  };
  const disarm = () => {
    if (timer.current) clearTimeout(timer.current);
    setShowTip(false);
  };

  const body = (
    <>
      <div className="flex items-center gap-3">
        <SkillIcon name={icon} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block text-xs text-muted">{sub}</span>
        </span>
        <span className={`shrink-0 text-lg font-bold tabular-nums ${virtualShown ? "text-gold/80 italic" : "text-gold"}`} title={virtualShown ? "Virtual level" : undefined}>
          {level}
        </span>
      </div>
      <Bar fraction={progress.fraction} color={barColor(progress.target)} maxed={progress.target === null} />
    </>
  );
  const classes = `block rounded-lg border bg-background/40 px-3 py-2 transition hover:border-gold/50 ${selected ? "border-gold" : "border-surface-border/60"}`;

  return (
    <li className="relative" onMouseEnter={arm} onMouseLeave={disarm} onFocus={arm} onBlur={disarm}>
      {href ? (
        <Link href={href} scroll={false} className={classes}>
          {body}
        </Link>
      ) : (
        <div className={classes}>{body}</div>
      )}
      {showTip && (
        <div role="tooltip" className="nav-pop pointer-events-none absolute top-full left-1/2 z-30 mt-2 w-64 -translate-x-1/2 rounded-lg border border-surface-border bg-surface p-3 text-xs shadow-2xl">
          {tip}
        </div>
      )}
    </li>
  );
}

function TipRows({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <>
      <p className="mb-1.5 text-sm font-semibold text-gold">{title}</p>
      <dl className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/**
 * The skills grid: RuneScape's skill icons, each with a progress bar towards its next big milestone (99, then 110 and
 * 120 where the skill goes that high, then 200M XP), and an Overall tile first, climbing towards max total XP. Rest the pointer on a
 * skill for the details. The checkbox switches the level numbers to virtual levels and is remembered across pages.
 */
export function SkillsGrid({ rsn, skills, totalLevel, selected }: { rsn: string; skills: SkillRow[]; totalLevel: number | null; selected: number | null }) {
  const virtual = useSyncExternalStore(subscribe, readVirtual, () => false);

  function toggle(on: boolean) {
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch {
      // can't remember it; it still applies until the page is left
    }
    window.dispatchEvent(new Event(CHANGED));
  }

  const virtualTotal = skills.reduce((sum, s) => sum + virtualLevel(s.id, s.xp), 0);
  // Summed from the skills themselves, so it always agrees with the tiles below it.
  const totalXp = skills.reduce((sum, s) => sum + s.xp, 0);
  const overall = totalXp >= MAX_TOTAL_XP ? { target: null, fraction: 1, stage: 3, remaining: 0 } : { target: { label: "Max total XP", xp: MAX_TOTAL_XP, virtual: false }, fraction: totalXp / MAX_TOTAL_XP, stage: 3, remaining: MAX_TOTAL_XP - totalXp };
  const maxedSkills = skills.filter((s) => s.xp >= MAX_XP).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={virtual} onChange={(e) => toggle(e.target.checked)} className="accent-[var(--color-gold)]" />
          Show virtual levels
        </label>
        <p className="text-xs text-muted">
          Bars show progress to the next goal: <span style={{ color: "#86efac" }}>99</span> → <span style={{ color: "#7dd3fc" }}>110</span> → <span style={{ color: "#c4b5fd" }}>120</span> → <span style={{ color: "#f9a8d4" }}>200M XP</span>
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          icon="Overall"
          name="Overall"
          sub={`${compact(totalXp)} XP · ${((totalXp / MAX_TOTAL_XP) * 100).toFixed(1)}% of max`}
          level={virtual ? virtualTotal : (totalLevel ?? skills.reduce((n, s) => n + s.level, 0))}
          virtualShown={virtual && virtualTotal !== totalLevel}
          progress={overall}
          tip={
            <TipRows
              title="Overall"
              rows={[
                ["Total level", String(totalLevel ?? "—")],
                ["Virtual total level", String(virtualTotal)],
                ["Total XP", full(totalXp)],
                ["Goal", `${compact(MAX_TOTAL_XP)} XP (every skill at 200M)`],
                ["Progress", `${(overall.fraction * 100).toFixed(2)}%`],
                ["Still to go", overall.remaining > 0 ? `${compact(overall.remaining)} XP` : "Maxed!"],
                ["Skills at 200M", `${maxedSkills} of ${SKILL_COUNT}`],
              ]}
            />
          }
        />

        {skills.map((skill) => {
          const progress = progressFor(skill.id, skill.xp);
          const virtualLvl = virtualLevel(skill.id, skill.xp);
          const showVirtual = virtual && virtualLvl > skill.level;
          return (
            <Tile
              key={skill.id}
              icon={skill.name}
              name={skill.name}
              sub={`${compact(skill.xp)} XP${skill.rank > 0 ? ` · rank ${full(skill.rank)}` : ""}`}
              level={showVirtual ? virtualLvl : skill.level}
              virtualShown={showVirtual}
              progress={progress}
              href={`/members/${encodeURIComponent(rsn)}?skill=${skill.id}#skill-chart`}
              selected={selected === skill.id}
              tip={
                <TipRows
                  title={skill.name}
                  rows={[
                    ["Level", `${skill.level}${realCap(skill.id) === skill.level ? " (max)" : ""}`],
                    ...(virtualLvl > skill.level ? ([["Virtual level", String(virtualLvl)]] as [string, string][]) : []),
                    ["XP", full(skill.xp)],
                    ["Next milestone", progress.target ? `${progress.target.label} · ${full(progress.target.xp)} XP` : "Maxed at 200M XP"],
                    ["Progress", progress.target ? `${(progress.fraction * 100).toFixed(1)}%` : "100%"],
                    ["Still to go", progress.target ? `${full(progress.remaining)} XP` : "—"],
                    ...(skill.rank > 0 ? ([["Rank", full(skill.rank)]] as [string, string][]) : []),
                  ]}
                />
              }
            />
          );
        })}
      </ul>
    </div>
  );
}
