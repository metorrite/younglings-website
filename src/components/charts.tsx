import Link from "next/link";
import { SkillIcon } from "@/components/site/SkillIcon";
import { compact } from "@/lib/site";

/**
 * The charts. The ones you can point at (donut, bar, line, multi-line) live in `ChartsInteractive` because they run in
 * the browser; they are re-exported here so pages keep importing everything from one place. What stays in this file is
 * plain server-rendered markup: sparklines and the ranked leaderboard bars.
 */

export { PALETTE } from "@/lib/chartPalette";
export { BarChart, DonutChart, LineChart, MultiLineChart } from "./ChartsInteractive";
export type { BarGroup, ChartFormat, LinePoint, LineSeries, Slice } from "./ChartsInteractive";

/** A tiny trend line with no axes — for stat tiles and table rows. */
export function Sparkline({ values, color = "#d4af37", width = 120, height = 32 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const span = Math.max(1, Math.max(...values) - min);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${((i / (values.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- horizontal leaderboard bars ----------

export function RankedBars({ rows, color = "#d4af37", format = compact, linkBase }: { rows: { label: string; value: number; /** The label is a skill name: show its icon. */ skill?: boolean }[]; color?: string; format?: (n: number) => string; linkBase?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="space-y-2">
      {rows.map((row, i) => (
        <li key={row.label} className="relative overflow-hidden rounded-md border border-surface-border/60 bg-background/40 px-3 py-2 text-sm">
          <div className="absolute inset-y-0 left-0 opacity-20" style={{ width: `${(row.value / max) * 100}%`, backgroundColor: color }} />
          <div className="relative flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-5 shrink-0 text-xs text-muted">{i + 1}</span>
              {row.skill && <SkillIcon name={row.label} size={20} />}
              {linkBase ? (
                <Link href={`${linkBase}${encodeURIComponent(row.label)}`} className="truncate font-medium hover:text-gold">
                  {row.label}
                </Link>
              ) : (
                <span className="truncate font-medium">{row.label}</span>
              )}
            </span>
            <span className="shrink-0 font-mono text-xs text-muted">{format(row.value)}</span>
          </div>
        </li>
      ))}
      {rows.length === 0 && <li className="text-sm text-muted">Nothing recorded yet.</li>}
    </ol>
  );
}
