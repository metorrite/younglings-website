"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TipBody, TipPortal } from "@/components/ui/Tip";

/**
 * The little "i" next to a setting. Hover or focus it for a short explanation in the site's themed pop-up; tap or click it to keep
 * the pop-up open (touch screens have no hover), and click elsewhere or press Escape to close it. It keeps long explanations out of
 * the way until someone wants them, so a settings page stays easy to scan.
 */
export function InfoBubble({ title, children, label = "More information" }: { title?: string; children: ReactNode; label?: string }) {
  const button = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

  const measure = () => {
    const box = button.current?.getBoundingClientRect();
    if (box) setAt({ x: box.left + box.width / 2, y: box.top });
  };

  useEffect(() => {
    if (!pinned) return;
    const away = (e: PointerEvent) => {
      if (!button.current?.contains(e.target as Node)) setPinned(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [pinned]);

  const open = hover || focus || pinned;

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onMouseEnter={() => {
          measure();
          setHover(true);
        }}
        onMouseLeave={() => setHover(false)}
        onFocus={() => {
          measure();
          setFocus(true);
        }}
        onBlur={() => setFocus(false)}
        onClick={(e) => {
          e.preventDefault();
          measure();
          setPinned((p) => !p);
        }}
        className="inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-muted/50 font-serif text-[10px] leading-none font-semibold text-muted italic transition hover:border-gold hover:text-gold focus-visible:border-gold focus-visible:text-gold focus-visible:outline-none"
      >
        i
      </button>
      {open && at && (
        <TipPortal x={at.x} y={at.y}>
          <TipBody title={title}>
            <div className="space-y-1.5 text-xs leading-relaxed text-foreground/90">{children}</div>
          </TipBody>
        </TipPortal>
      )}
    </>
  );
}
