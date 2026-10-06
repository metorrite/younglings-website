import Link from "next/link";
import type { ReactNode } from "react";
import { compact } from "@/lib/site";

/**
 * Small hand-built SVG charts. Nothing here needs JavaScript in the browser: they're plain server-rendered
 * SVG, scale with their container, and take their colours from the site theme (`currentColor` plus the
 * palette below) so they sit naturally on the dark background.
 */

export const PALETTE = ["#d4af37", "#5aa9e6", "#8b7cf6", "#3ecf8e", "#e0627a", "#e0a24a", "#4cc9c0", "#b0b7c3", "#c084fc", "#f97316", "#84cc16", "#38bdf8"];

// ---------- donut ----------

export interface Slice {
  label: string;
  value: number;
  color?: string;
}

export function DonutChart({ slices, center, size = 180 }: { slices: Slice[]; center?: ReactNode; size?: number }) {
  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((sum, s) => sum + s.value, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" role="img" aria-label="Donut chart">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="26" />
          {total > 0 &&
            data.map((slice, i) => {
              const length = (slice.value / total) * circumference;
              const circle = (
                <circle
                  key={slice.label}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={slice.color ?? PALETTE[i % PALETTE.length]}
                  strokeWidth="26"
                  strokeDasharray={`${Math.max(0, length - 1.5)} ${circumference}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })}
        </svg>
        {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
      </div>

      <ul className="min-w-40 flex-1 space-y-1.5 text-sm">
        {data.map((slice, i) => (
          <li key={slice.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: slice.color ?? PALETTE[i % PALETTE.length] }} />
              {slice.label}
            </span>
            <span className="text-muted">
              {compact(slice.value)} <span className="text-xs">({total ? Math.round((slice.value / total) * 100) : 0}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- bars ----------

export interface BarGroup {
  label: string;
  values: number[];
}

/** Grouped vertical bars: one group per label, one bar per series. */
export function BarChart({ groups, series, height = 200 }: { groups: BarGroup[]; series: { name: string; color: string }[]; height?: number }) {
  const width = 640;
  const pad = { top: 12, right: 8, bottom: 26, left: 34 };
  const max = Math.max(1, ...groups.flatMap((g) => g.values));
  const niceMax = Math.ceil(max / 5) * 5 || 5;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const groupW = groups.length ? innerW / groups.length : innerW;
  const barW = Math.min(26, (groupW * 0.7) / series.length);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Bar chart">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.08" />
              <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.5">
                {Math.round(niceMax * t)}
              </text>
            </g>
          );
        })}
        {groups.map((group, gi) => {
          const x0 = pad.left + gi * groupW + (groupW - barW * series.length) / 2;
          return (
            <g key={group.label + gi}>
              {group.values.map((value, si) => {
                const h = (value / niceMax) * innerH;
                return (
                  <rect key={si} x={x0 + si * barW} y={pad.top + innerH - h} width={barW - 2} height={h} rx="3" fill={series[si].color}>
                    <title>{`${group.label} — ${series[si].name}: ${value}`}</title>
                  </rect>
                );
              })}
              <text x={pad.left + gi * groupW + groupW / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.55">
                {group.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
        {series.map((s) => (
          <li key={s.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- line / area ----------

export interface LinePoint {
  label: string;
  value: number;
}

export function LineChart({ points, color = "#d4af37", height = 200, format = compact }: { points: LinePoint[]; color?: string; height?: number; format?: (n: number) => string }) {
  const width = 640;
  const pad = { top: 14, right: 12, bottom: 26, left: 52 };
  if (points.length < 2) {
    return <p className="py-8 text-center text-sm text-muted">Not enough history yet — check back after a few more polls.</p>;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (i / (points.length - 1)) * innerW;
  const y = (v: number) => pad.top + innerH - ((v - min) / span) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${pad.top + innerH} L${x(0).toFixed(1)},${pad.top + innerH} Z`;
  const gradientId = `grad-${color.replace("#", "")}`;
  const tickIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Line chart">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => {
        const yy = pad.top + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={yy} y2={yy} stroke="currentColor" strokeOpacity="0.08" />
            <text x={pad.left - 6} y={yy + 3} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.5">
              {format(min + span * t)}
            </text>
          </g>
        );
      })}
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4 : 2} fill={color}>
          <title>{`${p.label}: ${format(p.value)}`}</title>
        </circle>
      ))}
      {tickIdx.map((i) => (
        <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="10" fill="currentColor" fillOpacity="0.55">
          {points[i].label}
        </text>
      ))}
    </svg>
  );
}

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

export function RankedBars({ rows, color = "#d4af37", format = compact, linkBase }: { rows: { label: string; value: number }[]; color?: string; format?: (n: number) => string; linkBase?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="space-y-2">
      {rows.map((row, i) => (
        <li key={row.label} className="relative overflow-hidden rounded-md border border-surface-border/60 bg-background/40 px-3 py-2 text-sm">
          <div className="absolute inset-y-0 left-0 opacity-20" style={{ width: `${(row.value / max) * 100}%`, backgroundColor: color }} />
          <div className="relative flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-5 shrink-0 text-xs text-muted">{i + 1}</span>
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
