"use client";

import { useRef, useState, type ReactNode } from "react";
import { SkillIcon } from "@/components/site/SkillIcon";
import { TipBody, TipPortal } from "@/components/ui/Tip";
import { PALETTE } from "@/lib/chartPalette";
import { compact, full } from "@/lib/site";

/**
 * The charts people point at: donut, bar, line and multi-line. Hovering shows a themed info window for whatever is under
 * the pointer — a following dot and guide on the line charts, a highlighted slice or bar on the others.
 *
 * Pages hand these charts plain data. How numbers are written is chosen by name (`format`) rather than by passing a
 * function, because a server page can't pass functions to a browser component.
 */

export type ChartFormat = "compact" | "full" | "integer" | "gp" | "plain";

const FORMATS: Record<ChartFormat, (n: number) => string> = {
  compact,
  full,
  integer: (n) => String(Math.round(n)),
  gp: (n) => `${compact(n)} gp`,
  plain: String,
};

/** Black or white text, whichever reads better on a `#rrggbb` background. */
function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const luminance = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luminance > 0.55 ? "#0b0d12" : "#ffffff";
}

const GREY = "#4b5563";

// ---------- donut ----------

export interface Slice {
  label: string;
  value: number;
  color?: string;
  /** A skill name: shows that skill's icon beside the label, and colours the label. */
  skill?: string;
}

/**
 * A donut with each slice also listed as a bar: the skill icon (if it is one) and name on the left, and a bar whose
 * filled part says how much and what share. Point at a slice or a bar and the other lights up with an info window.
 */
export function DonutChart({ slices, center, size = 180, format = "compact", unit = "", valueLabel = "Total" }: { slices: Slice[]; center?: ReactNode; size?: number; format?: ChartFormat; unit?: string; valueLabel?: string }) {
  const fmt = FORMATS[format];
  const data = slices.filter((s) => s.value > 0).map((s, i) => ({ ...s, color: s.color ?? PALETTE[i % PALETTE.length] }));
  const total = data.reduce((sum, s) => sum + s.value, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const top = Math.max(1, ...data.map((s) => s.value));

  let offset = 0;
  const hovered = hover ? data[hover.i] : null;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" role="img" aria-label="Donut chart">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="26" />
          {total > 0 &&
            data.map((slice, i) => {
              const length = (slice.value / total) * circumference;
              const active = hover?.i === i;
              const circle = (
                <circle
                  key={slice.label}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={active ? 32 : 26}
                  strokeOpacity={hover && !active ? 0.35 : 1}
                  strokeDasharray={`${Math.max(0, length - 1.5)} ${circumference}`}
                  strokeDashoffset={-offset}
                  pointerEvents="stroke"
                  style={{ transition: "stroke-width 120ms, stroke-opacity 120ms" }}
                  onPointerMove={(e) => setHover({ i, x: e.clientX, y: e.clientY })}
                  onPointerLeave={() => setHover(null)}
                />
              );
              offset += length;
              return circle;
            })}
        </svg>
        {center && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
      </div>

      <ul className="min-w-56 flex-1 space-y-1.5 text-sm">
        {data.map((slice, i) => {
          const share = total ? slice.value / total : 0;
          const wide = share >= 0.28;
          const nameColor = slice.color === GREY ? undefined : slice.color;
          const label = `${fmt(slice.value)}${unit} · ${Math.round(share * 100)}%`;
          return (
            <li
              key={slice.label}
              className={`flex items-center gap-2 rounded-md transition-opacity ${hover && hover.i !== i ? "opacity-50" : ""}`}
              onPointerMove={(e) => setHover({ i, x: e.clientX, y: e.clientY })}
              onPointerLeave={() => setHover(null)}
            >
              {slice.skill ? <SkillIcon name={slice.skill} size={22} /> : <span className="flex w-[22px] shrink-0 justify-center"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: slice.color }} /></span>}
              <span className="w-24 shrink-0 truncate font-medium sm:w-28" style={{ color: nameColor }}>
                {slice.label}
              </span>
              <span className="relative flex h-6 min-w-0 flex-1 items-center overflow-hidden rounded bg-white/5">
                <span className="flex h-full items-center rounded px-2 text-xs font-semibold whitespace-nowrap" style={{ width: `${Math.max(2, (slice.value / top) * 100)}%`, backgroundColor: slice.color, color: readableOn(slice.color) }}>
                  {wide ? label : ""}
                </span>
                {!wide && <span className="ml-2 text-xs whitespace-nowrap text-muted">{label}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      {hover && hovered && (
        <TipPortal x={hover.x} y={hover.y}>
          <TipBody
            icon={hovered.skill ? <SkillIcon name={hovered.skill} size={20} /> : undefined}
            title={hovered.label}
            titleColor={hovered.color === GREY ? "#e5e7eb" : hovered.color}
            rows={[
              [valueLabel, `${fmt(hovered.value)}${unit}`],
              ["Share", `${total ? ((hovered.value / total) * 100).toFixed(1) : 0}%`],
            ]}
          />
        </TipPortal>
      )}
    </div>
  );
}

// ---------- bars ----------

export interface BarGroup {
  label: string;
  values: number[];
}

/** Grouped vertical bars: one group per label, one bar per series. Point at a group for its values. */
export function BarChart({ groups, series, height = 200, format = "full" }: { groups: BarGroup[]; series: { name: string; color: string }[]; height?: number; format?: ChartFormat }) {
  const fmt = FORMATS[format];
  const width = 640;
  const pad = { top: 12, right: 8, bottom: 26, left: 46 };
  const max = Math.max(1, ...groups.flatMap((g) => g.values));
  const niceMax = Math.ceil(max / 5) * 5 || 5;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const groupW = groups.length ? innerW / groups.length : innerW;
  const barW = Math.min(26, (groupW * 0.7) / series.length);
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

  function point(i: number) {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = rect.width / width;
    const tallest = Math.max(...groups[i].values);
    setHover({ i, x: rect.left + (pad.left + groupW * i + groupW / 2) * scale, y: rect.top + (pad.top + innerH - (tallest / niceMax) * innerH) * scale });
  }

  return (
    <div>
      <svg ref={svg} viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Bar chart" onPointerLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.08" />
              <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.5">
                {compact(niceMax * t)}
              </text>
            </g>
          );
        })}
        {groups.map((group, gi) => {
          const gx = pad.left + groupW * gi;
          const active = hover?.i === gi;
          return (
            <g key={gi} onPointerMove={() => point(gi)}>
              {active && <rect x={gx} y={pad.top} width={groupW} height={innerH} fill="currentColor" fillOpacity="0.06" rx="3" />}
              {group.values.map((value, si) => {
                const h = (value / niceMax) * innerH;
                const bx = gx + (groupW - barW * series.length) / 2 + si * barW;
                return <rect key={si} x={bx} y={pad.top + innerH - h} width={Math.max(1, barW - 2)} height={h} rx="2" fill={series[si].color} fillOpacity={hover && !active ? 0.55 : 1} />;
              })}
              <text x={gx + groupW / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.55">
                {groups.length > 16 && gi % 2 === 1 ? "" : group.label}
              </text>
              {/* an invisible strip over the whole column so the pointer doesn't have to find a thin bar */}
              <rect x={gx} y={pad.top} width={groupW} height={innerH + 20} fill="transparent" />
            </g>
          );
        })}
      </svg>
      {series.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      )}
      {hover && (
        <TipPortal x={hover.x} y={hover.y}>
          <TipBody
            title={groups[hover.i].label}
            rows={series.map((s, si) => [
              <span key={s.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>,
              fmt(groups[hover.i].values[si]),
            ])}
          />
        </TipPortal>
      )}
    </div>
  );
}

// ---------- line / area ----------

export interface LinePoint {
  label: string;
  value: number;
}

/**
 * A line with a soft fill. Move the pointer along it and a dot follows the line, with an info window for that point:
 * its date, its value, and how much it changed since the point before.
 */
export function LineChart({ points, color = "#d4af37", height = 200, format = "compact", valueLabel = "Value" }: { points: LinePoint[]; color?: string; height?: number; format?: ChartFormat; valueLabel?: string }) {
  const fmt = FORMATS[format];
  const width = 640;
  const pad = { top: 14, right: 12, bottom: 26, left: 52 };
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

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

  function move(clientX: number) {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = rect.width / width;
    const svgX = (clientX - rect.left) / scale;
    const i = Math.min(points.length - 1, Math.max(0, Math.round(((svgX - pad.left) / innerW) * (points.length - 1))));
    setHover({ i, x: rect.left + x(i) * scale, y: rect.top + y(points[i].value) * scale });
  }

  const here = hover ? points[hover.i] : null;
  const change = hover && hover.i > 0 ? points[hover.i].value - points[hover.i - 1].value : null;

  return (
    <>
      <svg ref={svg} viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Line chart" style={{ touchAction: "pan-y" }} onPointerLeave={() => setHover(null)}>
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
                {fmt(min + span * t)}
              </text>
            </g>
          );
        })}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.length <= 40 && points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r={2} fill={color} />)}
        <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].value)} r={4} fill={color} />
        {tickIdx.map((i) => (
          <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="10" fill="currentColor" fillOpacity="0.55">
            {points[i].label}
          </text>
        ))}
        {hover && here && (
          <g pointerEvents="none">
            <line x1={x(hover.i)} x2={x(hover.i)} y1={pad.top} y2={pad.top + innerH} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 3" />
            <circle cx={x(hover.i)} cy={y(here.value)} r={9} fill={color} fillOpacity="0.22" />
            <circle cx={x(hover.i)} cy={y(here.value)} r={5} fill={color} stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}
        <rect x={pad.left} y={pad.top} width={innerW} height={innerH + 12} fill="transparent" onPointerMove={(e) => move(e.clientX)} />
      </svg>
      {hover && here && (
        <TipPortal x={hover.x} y={hover.y}>
          <TipBody
            title={here.label}
            rows={[
              [valueLabel, fmt(here.value)],
              ...(change !== null && change !== 0 ? ([["Change", <span key="c" className={change > 0 ? "text-emerald-400" : "text-red-400"}>{`${change > 0 ? "+" : "−"}${fmt(Math.abs(change))}`}</span>]] as [ReactNode, ReactNode][]) : []),
            ]}
          />
        </TipPortal>
      )}
    </>
  );
}

// ---------- several lines on one set of axes ----------

export interface LineSeries {
  name: string;
  color: string;
  /** One value per label; `null` for "no data that day" (the line skips it). */
  values: (number | null)[];
}

export function MultiLineChart({ labels, series, height = 220, format = "compact" }: { labels: string[]; series: LineSeries[]; height?: number; format?: ChartFormat }) {
  const fmt = FORMATS[format];
  const width = 640;
  const pad = { top: 14, right: 12, bottom: 26, left: 52 };
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  if (labels.length < 2 || all.length < 2) {
    return <p className="py-8 text-center text-sm text-muted">Not enough history yet — check back after a few more polls.</p>;
  }

  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(1, max - min);
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (i / (labels.length - 1)) * innerW;
  const y = (v: number) => pad.top + innerH - ((v - min) / span) * innerH;
  const tickIdx = [0, Math.floor((labels.length - 1) / 2), labels.length - 1];

  function move(clientX: number) {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = rect.width / width;
    const svgX = (clientX - rect.left) / scale;
    const i = Math.min(labels.length - 1, Math.max(0, Math.round(((svgX - pad.left) / innerW) * (labels.length - 1))));
    const shown = series.map((s) => s.values[i]).filter((v): v is number => v !== null);
    setHover({ i, x: rect.left + x(i) * scale, y: rect.top + y(shown.length ? Math.max(...shown) : min) * scale });
  }

  return (
    <div>
      <svg ref={svg} viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Comparison line chart" style={{ touchAction: "pan-y" }} onPointerLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((t) => {
          const yy = pad.top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={yy} y2={yy} stroke="currentColor" strokeOpacity="0.08" />
              <text x={pad.left - 6} y={yy + 3} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.5">
                {fmt(min + span * t)}
              </text>
            </g>
          );
        })}
        {series.map((line) => {
          let d = "";
          let pen = false;
          line.values.forEach((v, i) => {
            if (v === null) {
              pen = false;
              return;
            }
            d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
            pen = true;
          });
          return <path key={line.name} d={d} fill="none" stroke={line.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />;
        })}
        {tickIdx.map((i) => (
          <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"} fontSize="10" fill="currentColor" fillOpacity="0.55">
            {labels[i]}
          </text>
        ))}
        {hover && (
          <g pointerEvents="none">
            <line x1={x(hover.i)} x2={x(hover.i)} y1={pad.top} y2={pad.top + innerH} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 3" />
            {series.map((s) => {
              const v = s.values[hover.i];
              return v === null ? null : <circle key={s.name} cx={x(hover.i)} cy={y(v)} r={5} fill={s.color} stroke="#ffffff" strokeWidth="1.5" />;
            })}
          </g>
        )}
        <rect x={pad.left} y={pad.top} width={innerW} height={innerH + 12} fill="transparent" onPointerMove={(e) => move(e.clientX)} />
      </svg>
      <ul className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
        {series.map((line) => (
          <li key={line.name} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ backgroundColor: line.color }} />
            {line.name}
          </li>
        ))}
      </ul>
      {hover && (
        <TipPortal x={hover.x} y={hover.y}>
          <TipBody
            title={labels[hover.i]}
            rows={series.map((s) => [
              <span key={s.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>,
              s.values[hover.i] === null ? "—" : fmt(s.values[hover.i] as number),
            ])}
          />
        </TipPortal>
      )}
    </div>
  );
}
