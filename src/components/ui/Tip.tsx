"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * The site's info windows: quick, themed pop-ups that replace the browser's plain `title` tooltips. One look everywhere —
 * a small dark card with a gold heading and label/value rows, like the one on the skills grid.
 *
 * `TipPortal` is the bare window, placed at a point on screen (charts move it with the pointer). `Tip` wraps any element
 * and shows a window above it on hover or keyboard focus. The window is drawn at the top of the page, so no panel
 * or scrolling table can clip it.
 */

const HALF_WIDTH = 132; // half of the window's widest size, so it never runs off either side of the screen

/** A window centred above (or, near the top of the screen, below) the screen point `x`, `y`. */
export function TipPortal({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  if (typeof document === "undefined") return null;
  const left = Math.min(Math.max(x, HALF_WIDTH), window.innerWidth - HALF_WIDTH);
  const below = y < 120;
  return createPortal(
    <div
      role="tooltip"
      className="nav-pop pointer-events-none fixed z-[70] w-max max-w-64 rounded-lg border border-surface-border bg-surface p-3 text-xs shadow-2xl"
      style={{ left, top: below ? y + 18 : y - 12, transform: below ? "translateX(-50%)" : "translate(-50%, -100%)" }}
    >
      {children}
    </div>,
    document.body,
  );
}

/** The inside of a window: an optional icon and heading, then label/value rows or free content. */
export function TipBody({ title, titleColor, icon, rows, children }: { title?: ReactNode; titleColor?: string; icon?: ReactNode; rows?: [ReactNode, ReactNode][]; children?: ReactNode }) {
  return (
    <>
      {title && (
        <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold" style={{ color: titleColor ?? "var(--color-gold)" }}>
          {icon}
          {title}
        </p>
      )}
      {rows && (
        <dl className="space-y-1">
          {rows.map(([label, value], i) => (
            <div key={i} className="flex justify-between gap-4">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium whitespace-nowrap">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </>
  );
}

/** Wraps an element and shows `content` in a window above it on hover or focus. Adds no wrapper box of its own. */
export function Tip({ content, children, delay = 60 }: { content: ReactNode; children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const box = ref.current?.firstElementChild?.getBoundingClientRect();
      if (box) setAt({ x: box.left + box.width / 2, y: box.top });
    }, delay);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setAt(null);
  };

  return (
    <span ref={ref} className="contents" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {at && <TipPortal x={at.x} y={at.y}>{content}</TipPortal>}
    </span>
  );
}
