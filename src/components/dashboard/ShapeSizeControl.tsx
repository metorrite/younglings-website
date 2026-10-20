"use client";

import { shapeRange, shapeTiles, sketchRings, sketchRows } from "@/lib/bingoShapes";

/** A small drawing of a shape at a size: dots in rows (pyramid, path, tree) or in rings (convergence). Decorative; the tile count is written next to it. */
export function ShapeSketch({ shape, size, className = "" }: { shape: string; size: number; className?: string }) {
  const width = 240;
  const height = 150;
  const dots: { x: number; y: number }[] = [];
  const lines: [number, number, number, number][] = [];
  const rows = sketchRows(shape, size);
  if (shape === "convergence") {
    const rings = sketchRings(size);
    const cx = width / 2;
    const cy = height / 2;
    const step = (height / 2 - 8) / (rings.length - 1);
    rings.forEach((count, i) => {
      const radius = (rings.length - 1 - i) * step;
      if (count === 1) dots.push({ x: cx, y: cy });
      else for (let k = 0; k < count; k++) dots.push({ x: cx + radius * Math.cos(-Math.PI / 2 + (2 * Math.PI * (k + 0.5)) / count), y: cy + radius * Math.sin(-Math.PI / 2 + (2 * Math.PI * (k + 0.5)) / count) });
    });
  } else if (rows) {
    const gapY = (height - 16) / Math.max(1, rows.length - 1 || 1);
    const widest = Math.max(...rows);
    rows.forEach((count, r) => {
      const y = rows.length === 1 ? height / 2 : 8 + r * gapY;
      const gapX = (width - 24) / Math.max(1, widest);
      for (let k = 0; k < count; k++) {
        // a path winds: every other row runs the other way, so its dots are mirrored
        const slot = shape === "path" && r % 2 === 1 ? widest - 1 - k : k;
        const x = shape === "path" ? 12 + gapX / 2 + slot * gapX : width / 2 + (k - (count - 1) / 2) * (shape === "tree" ? (widest / count) * gapX : gapX);
        dots.push({ x, y });
      }
    });
    if (shape === "path") for (let i = 1; i < dots.length; i++) lines.push([dots[i - 1].x, dots[i - 1].y, dots[i].x, dots[i].y]);
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`A ${shape} with ${shapeTiles(shape, size)} tiles`} className={`h-auto w-full max-w-60 ${className}`}>
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={0.3} strokeWidth={1.5} />
      ))}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={dots.length > 30 ? 3.5 : 5.5} fill="currentColor" className="text-gold" />
      ))}
    </svg>
  );
}

/**
 * Picks how big a bingo shape is, with a live sketch and tile count. {@code value} 0 means the painted picture the shape has always had. Sizes are limited
 * to what the bot accepts (see lib/bingoShapes), so a size picked here is never refused.
 */
export function ShapeSizeControl({ shape, value, onChange, disabled = false }: { shape: string; value: number; onChange: (size: number) => void; disabled?: boolean }) {
  const range = shapeRange(shape);
  if (!range) return <p className="text-sm text-muted">This shape has one size.</p>;
  const shown = value === 0 ? (range.picture > 0 ? range.picture : range.min) : value;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ShapeSketch shape={shape} size={value} className="shrink-0 rounded-lg border border-surface-border bg-background/40 p-2" />
      <div className="min-w-56 flex-1 space-y-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">
            {range.what.charAt(0).toUpperCase() + range.what.slice(1)}: {value === 0 ? "the picture's own" : value}
          </span>
          <input
            type="range"
            min={range.min}
            max={range.max}
            value={shown}
            disabled={disabled || value === 0}
            aria-label={`Number of ${range.what}`}
            onChange={(ev) => onChange(Number(ev.target.value))}
            className="w-full accent-[var(--color-gold)]"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value === 0} disabled={disabled} onChange={(ev) => onChange(ev.target.checked ? 0 : shown)} />
          Use the painted picture ({range.pictureTiles} tiles)
        </label>
        <p className="text-xs text-muted">
          {shapeTiles(shape, value)} tiles{value === 0 ? "" : `, drawn in code at ${range.min} to ${range.max} ${range.what}`}.
        </p>
      </div>
    </div>
  );
}
