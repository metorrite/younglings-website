"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import type { CitadelCappers } from "@/lib/citadelTypes";
import {
  addEntries,
  drawWheel,
  endAngle,
  MAX_ENTRIES,
  parseExtras,
  secureIndex,
  spread,
  totalEntries,
  type WheelEntry,
} from "@/lib/wheel";

type Load = (end: string | null) => Promise<{ ok: true; data: CitadelCappers } | { ok: false; error: string }>;

const SIZE = 560;
const SPIN_MS = 7000;

const fromCappers = (names: string[]): WheelEntry[] => names.map((name) => ({ name, entries: 1 }));

/**
 * A wheel of names for the week's Citadel cappers: add or remove names, give someone an extra entry (a prize, a make-up for a missed cap), spin it, and
 * keep a list of who won. Everything runs in the browser except fetching who capped.
 */
export function CitadelWheel({ initial, load }: { initial: CitadelCappers; load: Load }) {
  const [week, setWeek] = useState(initial);
  const [entries, setEntries] = useState<WheelEntry[]>(fromCappers(initial.cappers));
  const [extrasText, setExtrasText] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [winnerIndex, setWinnerIndex] = useState(-1);
  const [history, setHistory] = useState<{ name: string; week: string }[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, startLoad] = useTransition();
  const canvas = useRef<HTMLCanvasElement>(null);
  const angle = useRef(0);
  const frame = useRef<number | null>(null);

  const changeEntries = (next: WheelEntry[]) => {
    setEntries(next);
    setWinner(null);
    setWinnerIndex(-1);
  };

  const labels = spread(entries);
  const total = totalEntries(entries);

  const paint = useCallback(
    (winnerIndex: number, text: string) => {
      const el = canvas.current;
      if (!el || labels.length === 0) {
        const ctx = el?.getContext("2d");
        if (el && ctx) ctx.clearRect(0, 0, el.width, el.height);
        return;
      }
      const ratio = window.devicePixelRatio || 1;
      el.width = SIZE * ratio;
      el.height = SIZE * ratio;
      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      drawWheel(ctx, SIZE, labels, angle.current, winnerIndex, text);
    },
    [labels],
  );

  useEffect(() => {
    if (!spinning) paint(winnerIndex, winnerIndex >= 0 ? (labels[winnerIndex] ?? "") : "");
  }, [paint, spinning, winnerIndex, labels]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  function spin() {
    if (spinning || labels.length === 0) return;
    setWinner(null);
    setWinnerIndex(-1);
    setError(null);
    const n = labels.length;
    const pick = secureIndex(n);
    const inside = 0.15 + (secureIndex(1000) / 1000) * 0.7;
    const end = endAngle(pick, n, inside);
    const current = angle.current;
    const turns = Math.ceil((current + 5 * 2 * Math.PI - end) / (2 * Math.PI));
    const target = end + turns * 2 * Math.PI;
    const began = performance.now();
    setSpinning(true);
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / SPIN_MS);
      const eased = 1 - Math.pow(1 - t, 4);
      angle.current = current + (target - current) * eased;
      const el = canvas.current;
      const ctx = el?.getContext("2d");
      if (el && ctx) {
        const ratio = window.devicePixelRatio || 1;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        drawWheel(ctx, SIZE, labels, angle.current, t >= 1 ? pick : -1, t >= 1 ? labels[pick] : "");
      }
      if (t < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        frame.current = null;
        angle.current = end;
        setSpinning(false);
        setWinner(labels[pick]);
        setWinnerIndex(pick);
        setHistory((h) => [{ name: labels[pick], week: `${week.start} to ${week.end}` }, ...h].slice(0, 20));
      }
    };
    frame.current = requestAnimationFrame(step);
  }

  function chooseWeek(end: string) {
    startLoad(async () => {
      const result = await load(end);
      if (!result.ok) return setError(result.error);
      setError(null);
      setWeek(result.data);
      changeEntries(fromCappers(result.data.cappers));
      setWinner(null);
      setWinnerIndex(-1);
    });
  }

  function addExtras() {
    const parsed = parseExtras(extrasText);
    setProblems(parsed.problems);
    let next = entries;
    for (const e of parsed.extras) next = addEntries(next, e.name, e.entries);
    if (totalEntries(next) > MAX_ENTRIES) return setProblems([...parsed.problems, `The wheel holds up to ${MAX_ENTRIES} entries.`]);
    changeEntries(next);
    if (parsed.extras.length > 0) setExtrasText("");
  }

  async function copyList() {
    try {
      await navigator.clipboard.writeText(entries.map((e) => e.name).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the names in the list instead.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted" htmlFor="week">
            Week
          </label>
          <select id="week" className={`${inputClass} max-w-64`} value={week.end} disabled={loading || spinning} onChange={(ev) => chooseWeek(ev.target.value)}>
            {week.weeks.map((w) => (
              <option key={w.end} value={w.end}>
                {w.start} to {w.end}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted">{week.cappers.length} capped</span>
        </div>

        {error && <Notice tone="error" title={error} />}

        <div className="relative mx-auto w-full max-w-[560px]">
          <canvas ref={canvas} style={{ width: "100%", aspectRatio: "1 / 1" }} aria-label="Wheel of names" />
          {labels.length === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-muted">Nobody on the wheel yet.</p>}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" className={primaryButton} disabled={spinning || labels.length === 0} onClick={spin}>
            {spinning ? "Spinning..." : winner ? "Spin again" : "Spin the wheel"}
          </button>
          {winner && !spinning && (
            <button type="button" className={ghostButton} onClick={() => changeEntries(entries.filter((e) => e.name !== winner))}>
              Take {winner} off the wheel
            </button>
          )}
        </div>
        {winner && !spinning && <p className="text-center text-lg font-semibold text-gold">The wheel landed on {winner}</p>}
      </section>

      <aside className="min-w-0 space-y-5">
        <div className="space-y-2 rounded-xl border border-surface-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Add entries</h2>
          <textarea
            className={`${inputClass} min-h-24`}
            placeholder={"Axley\nBerserker87 x2\n(one name per line; x2 gives two entries)"}
            value={extrasText}
            onChange={(ev) => setExtrasText(ev.target.value)}
          />
          {problems.length > 0 && <p className="text-xs text-red-400">{problems.join(" ")}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ghostButton} disabled={spinning || !extrasText.trim()} onClick={addExtras}>
              Add to the wheel
            </button>
            <button type="button" className={ghostButton} disabled={spinning} onClick={() => changeEntries(fromCappers(week.cappers))}>
              Reset to who capped
            </button>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-surface-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              On the wheel ({total} {total === 1 ? "entry" : "entries"})
            </h2>
            <button type="button" className="text-xs text-gold underline" onClick={copyList}>
              {copied ? "Copied" : "Copy names"}
            </button>
          </div>
          {entries.length === 0 ? (
            <p className="text-sm text-muted">Nothing here.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-surface-border overflow-y-auto text-sm">
              {entries.map((e) => (
                <li key={e.name} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0 truncate">{e.name}</span>
                  <span className="flex shrink-0 items-center gap-2 tabular-nums">
                    <button type="button" aria-label={`Fewer entries for ${e.name}`} disabled={spinning} className="px-1 text-muted hover:text-foreground" onClick={() => changeEntries(entries.map((x) => (x.name === e.name ? { ...x, entries: Math.max(1, x.entries - 1) } : x)))}>
                      −
                    </button>
                    {e.entries}
                    <button type="button" aria-label={`More entries for ${e.name}`} disabled={spinning || total >= MAX_ENTRIES} className="px-1 text-muted hover:text-foreground" onClick={() => changeEntries(entries.map((x) => (x.name === e.name ? { ...x, entries: x.entries + 1 } : x)))}>
                      +
                    </button>
                    <button type="button" aria-label={`Remove ${e.name}`} disabled={spinning} className="px-1 text-red-400" onClick={() => changeEntries(entries.filter((x) => x.name !== e.name))}>
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {history.length > 0 && (
          <div className="space-y-2 rounded-xl border border-surface-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Winners so far</h2>
            <ol className="space-y-1 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="font-medium">{h.name}</span>
                  <span className="text-xs text-muted">{h.week}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </aside>
    </div>
  );
}
