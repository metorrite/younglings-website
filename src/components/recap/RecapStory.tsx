"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Slide } from "@/lib/recap";
import { compact, full } from "@/lib/site";
import { Tip, TipBody } from "@/components/ui/Tip";

const SLIDE_SECONDS = 6.5;

const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A number that counts up from zero when it appears (or just shows, for people who prefer less motion). */
function CountUp({ value, format }: { value: number; format: "xp" | "int" }) {
  const reduced = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const start = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);

  const n = reduced ? value : shown;
  return <span className="tabular-nums">{format === "xp" ? compact(n) : full(n)}</span>;
}

function Backdrop({ accent }: { accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="recap-blob absolute -top-24 -left-20 h-72 w-72 rounded-full opacity-40 blur-3xl" style={{ backgroundColor: accent }} />
      <div className="recap-blob absolute -right-24 bottom-10 h-80 w-80 rounded-full opacity-25 blur-3xl" style={{ backgroundColor: accent, animationDelay: "-4s" }} />
    </div>
  );
}

const delay = (n: number) => ({ "--d": `${n}s` }) as React.CSSProperties;

function SlideView({ slide }: { slide: Slide }) {
  const eyebrow = (text: string, accent: string) => (
    <p className="recap-rise text-xs font-semibold tracking-[0.25em] uppercase" style={{ ...delay(0.05), color: accent }}>
      {text}
    </p>
  );

  switch (slide.kind) {
    case "intro":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- the clan logo, decorative */}
          <img src="/clan-logo.png" alt="" width={96} height={96} className="recap-pop rounded-full ring-2 shadow-2xl" style={{ ...delay(0.1), boxShadow: `0 0 60px ${slide.accent}55` }} />
          {eyebrow(slide.eyebrow, slide.accent)}
          <h2 className="recap-rise text-4xl font-extrabold tracking-tight break-words" style={{ ...delay(0.3), color: slide.accent }}>
            {slide.title}
          </h2>
          <p className="recap-rise text-xl text-foreground/90" style={delay(0.55)}>
            {slide.subtitle}
          </p>
          <p className="recap-rise mt-6 text-xs text-muted" style={delay(1.2)}>
            Tap to continue →
          </p>
        </div>
      );

    case "number":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
          {eyebrow(slide.eyebrow, slide.accent)}
          <p className="recap-pop text-7xl leading-none font-extrabold break-all" style={{ ...delay(0.25), color: slide.accent }}>
            <CountUp value={slide.value} format={slide.format} />
          </p>
          <p className="recap-rise text-xl font-medium" style={delay(0.7)}>
            {slide.caption}
          </p>
          {slide.note && (
            <p className="recap-rise mt-3 max-w-xs text-sm text-muted" style={delay(1.1)}>
              {slide.note}
            </p>
          )}
        </div>
      );

    case "rank":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          {eyebrow(slide.eyebrow, slide.accent)}
          <p className="recap-pop text-8xl leading-none font-extrabold" style={{ ...delay(0.25), color: slide.accent }}>
            #<CountUp value={slide.rank} format="int" />
          </p>
          <p className="recap-rise text-lg text-muted" style={delay(0.7)}>
            of {slide.outOf} members
          </p>
          <p className="recap-rise mt-2 text-xl font-medium" style={delay(0.9)}>
            {slide.caption}
          </p>
          {slide.note && (
            <p className="recap-rise mt-3 max-w-xs text-sm text-muted" style={delay(1.3)}>
              {slide.note}
            </p>
          )}
        </div>
      );

    case "bars": {
      const max = Math.max(1, ...slide.rows.map((r) => r.value));
      return (
        <div className="flex h-full flex-col justify-center gap-6">
          <div className="space-y-2">
            {eyebrow(slide.eyebrow, slide.accent)}
            <h2 className="recap-rise text-2xl leading-tight font-bold" style={delay(0.15)}>
              {slide.title}
            </h2>
          </div>
          <ol className="space-y-3.5">
            {slide.rows.map((row, i) => (
              <li key={row.label} className="recap-rise" style={delay(0.35 + i * 0.12)}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 text-xs text-muted">{i + 1}</span>
                    <span className="truncate font-medium">{row.label}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-foreground/80">{slide.format === "xp" ? compact(row.value) : full(row.value)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="recap-grow-x h-full rounded-full" style={{ ...delay(0.5 + i * 0.12), width: `${(row.value / max) * 100}%`, backgroundColor: slide.accent, opacity: 1 - i * 0.09 }} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    case "chart": {
      const max = Math.max(1, ...slide.points.map((p) => p.value));
      return (
        <div className="flex h-full flex-col justify-center gap-6">
          <div className="space-y-2">
            {eyebrow(slide.eyebrow, slide.accent)}
            <h2 className="recap-rise text-xl leading-snug font-bold" style={delay(0.15)}>
              {slide.title}
            </h2>
          </div>
          <div className="flex h-56 items-end gap-[3px]" role="img" aria-label={slide.title}>
            {slide.points.map((p, i) => (
              <Tip key={`${p.label}-${i}`} content={<TipBody title={p.label} rows={[["XP gained", `${compact(p.value)} XP`]]} />}>
              <div className="flex h-full flex-1 items-end">
                <div
                  className="recap-grow-y w-full rounded-t-sm"
                  style={{ ...delay(0.4 + (i / Math.max(1, slide.points.length)) * 0.9), height: `${Math.max(2, (p.value / max) * 100)}%`, backgroundColor: p.label === slide.highlight ? "#fff" : slide.accent, opacity: p.label === slide.highlight ? 1 : 0.75 }}
                />
              </div>
              </Tip>
            ))}
          </div>
          <div className="recap-rise flex justify-between text-[11px] text-muted" style={delay(1.4)}>
            <span>{slide.points[0]?.label}</span>
            <span>{slide.points[slide.points.length - 1]?.label}</span>
          </div>
        </div>
      );
    }

    case "stats":
      return (
        <div className="flex h-full flex-col justify-center gap-6">
          <div className="space-y-2">
            {eyebrow(slide.eyebrow, slide.accent)}
            <h2 className="recap-rise text-2xl leading-tight font-bold" style={delay(0.15)}>
              {slide.title}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {slide.items.map((item, i) => (
              <div key={item.label} className="recap-pop rounded-2xl border border-white/10 bg-white/5 p-4" style={delay(0.35 + i * 0.12)}>
                <p className="text-3xl leading-tight font-extrabold break-words" style={{ color: slide.accent }}>
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-muted">{item.label}</p>
                {item.sub && <p className="mt-0.5 truncate text-[11px] text-foreground/70">{item.sub}</p>}
              </div>
            ))}
          </div>
          {slide.chips && slide.chips.length > 0 && (
            <div className="recap-rise flex flex-wrap gap-1.5" style={delay(0.95)}>
              {slide.chips.map((c) => (
                <span key={c} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      );
  }
}

/**
 * The recap as a story: one slide at a time, auto-advancing with a progress bar for each, in the style of the
 * "year in review" stories people share. Tap the right or left side (or use the arrow keys / space) to move,
 * press and hold to pause. The last screen is the finished card — the same picture the Discord bot posts — with
 * buttons to save or share it. For anyone who prefers reduced motion, nothing moves or advances on its own.
 */
export function RecapStory({ slides, imageSrc, headline, detailsHref }: { slides: Slide[]; imageSrc: string; headline: string; detailsHref: string }) {
  const reduced = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);
  const total = slides.length + 1; // the last one is the finished card
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  const last = index === total - 1;
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        prev();
      }
    };
    const onHide = () => setPaused(document.hidden);
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [next, prev]);

  const accent = last ? "#d4af37" : slides[index].accent;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the address bar still works
    }
  }

  return (
    <div className="mx-auto w-full max-w-[26rem]">
      <div
        ref={stage}
        className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl border border-surface-border bg-[#0a0c10] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
        style={{ backgroundImage: `radial-gradient(circle at 20% 0%, ${accent}22, transparent 55%), linear-gradient(165deg, #0f131b, #07090d)` }}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        <Backdrop accent={accent} />

        {/* progress segments */}
        <div className="absolute inset-x-3 top-3 z-20 flex gap-1.5" aria-hidden>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              {i < index || (reduced && i <= index) ? (
                <div className="h-full w-full bg-white" />
              ) : i === index && !last ? (
                <div
                  key={index}
                  className="recap-progress h-full w-full bg-white"
                  style={{ ["--dur" as string]: `${SLIDE_SECONDS}s`, animationPlayState: paused ? "paused" : "running" }}
                  onAnimationEnd={next}
                />
              ) : i === index ? (
                <div className="h-full w-full bg-white" />
              ) : null}
            </div>
          ))}
        </div>

        <Link href="/recap" className="absolute top-7 right-4 z-30 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white/80 backdrop-blur hover:text-white" aria-label="Close the recap">
          ✕
        </Link>

        <div key={index} className="relative z-10 h-full px-7 pt-16 pb-10">
          {last ? (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated card; its size is fixed by the route */}
              <img src={imageSrc} alt={headline} className="recap-pop w-full rounded-2xl border border-white/10 shadow-2xl" style={delay(0.1)} />
              <div className="recap-rise flex w-full flex-wrap justify-center gap-2 text-sm" style={delay(0.5)}>
                <a href={imageSrc} download className="rounded-md bg-gold px-4 py-2 font-semibold text-background transition hover:brightness-110">
                  Save image
                </a>
                <button type="button" onClick={copyLink} className="rounded-md border border-white/20 px-4 py-2 transition hover:bg-white/10">
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
                <button type="button" onClick={() => setIndex(0)} className="rounded-md border border-white/20 px-4 py-2 transition hover:bg-white/10">
                  Replay
                </button>
              </div>
              <a href={detailsHref} className="recap-rise text-xs text-muted hover:text-foreground" style={delay(0.7)}>
                See every number below ↓
              </a>
            </div>
          ) : (
            <SlideView slide={slides[index]} />
          )}
        </div>

        {/* tap zones (the controls on the last slide stay clickable) */}
        {!last && (
          <>
            <button type="button" aria-label="Previous" className="absolute inset-y-16 left-0 z-20 w-1/3 cursor-w-resize" onClick={prev} />
            <button type="button" aria-label="Next" className="absolute inset-y-16 right-0 z-20 w-2/3 cursor-e-resize" onClick={next} />
          </>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-muted">
        {reduced ? "Use the arrow keys or tap to move on." : "Tap or use ← → · hold to pause"}
      </p>
    </div>
  );
}
