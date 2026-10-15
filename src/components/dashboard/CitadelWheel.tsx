"use client";

/* eslint-disable @next/next/no-img-element -- the wheel's GIF is a one-off picture served by our own route; next/image would re-encode (and flatten) it */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import type { CitadelCappers, WheelSettings, WheelWinner } from "@/lib/citadelTypes";
import { choicesOf, type GuildStructure } from "@/lib/jonnybot-admin";
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

type Failure = { ok: false; error: string; problems: string[] };
type Load = (end: string | null) => Promise<{ ok: true; data: CitadelCappers } | { ok: false; error: string }>;

const SIZE = 760;
const SPIN_MS = 7000;

type Actions = {
  saveSettings: (autoPost: boolean, channelId: string | null, message: string) => Promise<{ ok: true; data: WheelSettings } | Failure>;
  post: (winner: string, entries: string[], end: string) => Promise<{ ok: true; channel: string } | Failure>;
  /** Locks in a week's winner. `labels` and `winnerIndex` are the wheel as spun; both null for a past week typed in by hand. */
  lock: (end: string, winner: string, labels: string[] | null, winnerIndex: number | null, manual: boolean) => Promise<{ ok: true; data: WheelWinner; picture: "website" | "bot" } | Failure>;
  unlock: (end: string) => Promise<{ ok: true; data: WheelWinner[] } | Failure>;
  winner: (end: string) => Promise<{ ok: true; data: WheelWinner } | Failure>;
  postLocked: (end: string) => Promise<{ ok: true; channel: string } | Failure>;
};

type Note = { tone: "error" | "success"; title: string; items?: string[] };

const fromCappers = (names: string[]): WheelEntry[] => names.map((name) => ({ name, entries: 1 }));

/** The wheel a locked week was picked from: one entry per slice, names in the order they first appear. */
function fromSlices(slices: string[]): WheelEntry[] {
  const counts = new Map<string, number>();
  for (const s of slices) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts].map(([name, entries]) => ({ name, entries }));
}

const entriesOf = (week: CitadelCappers): WheelEntry[] => (week.winner ? fromSlices(week.winner.entries) : fromCappers(week.cappers));

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
const gifPath = (w: WheelWinner) => `/api/citadel-wheel/${w.gifToken}.gif`;
const weekLabel = (start: string, end: string) => `${DAY.format(new Date(`${start}T00:00:00Z`))} to ${DAY.format(new Date(`${end}T00:00:00Z`))}`;

/**
 * A wheel of names for the week's Citadel cappers: add or remove names, give someone an extra entry (a prize, a make-up for a missed cap), spin it, and
 * lock in the winner. A locked week keeps its winner and a GIF of the wheel landing on them, so the announcement (the server's message with the GIF
 * address at the end) can be copied again at any time and pasted into Discord with anything else to say. Everything runs in the browser except
 * fetching who capped, locking, and drawing the GIF.
 */
export function CitadelWheel({
  initial,
  winners: initialWinners,
  settings: initialSettings,
  structure,
  load,
  actions,
}: {
  initial: CitadelCappers;
  winners: WheelWinner[];
  settings: WheelSettings;
  structure: GuildStructure;
  load: Load;
  actions: Actions;
}) {
  const [week, setWeek] = useState(initial);
  const [records, setRecords] = useState(initialWinners);
  const [settings, setSettings] = useState(initialSettings);
  const [autoPost, setAutoPost] = useState(initialSettings.autoPost);
  const [channelId, setChannelId] = useState<string | null>(initialSettings.channelId);
  const [message, setMessage] = useState(initialSettings.message);
  const [settingsNote, setSettingsNote] = useState<Note | null>(null);
  const [saving, startSave] = useTransition();
  const [posted, setPosted] = useState<string | null>(null);
  const [postNote, setPostNote] = useState<Note | null>(null);
  const [posting, startPost] = useTransition();
  const [lockNote, setLockNote] = useState<Note | null>(null);
  const [locking, startLock] = useTransition();
  const [entries, setEntries] = useState<WheelEntry[]>(entriesOf(initial));
  const [extrasText, setExtrasText] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [winnerIndex, setWinnerIndex] = useState(-1);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedWeek, setCopiedWeek] = useState<string | null>(null);
  const [handDate, setHandDate] = useState("");
  const [handName, setHandName] = useState("");
  const [loading, startLoad] = useTransition();
  const canvas = useRef<HTMLCanvasElement>(null);
  const angle = useRef(0);
  const frame = useRef<number | null>(null);

  const locked = week.winner;
  const frozen = locked !== null;

  const changeEntries = (next: WheelEntry[]) => {
    setEntries(next);
    setWinner(null);
    setWinnerIndex(-1);
    setPosted(null);
    setPostNote(null);
  };

  const labels = spread(entries);
  const labelsKey = labels.join("\u0000");
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

  // a locked week shows the wheel it was picked from, resting on its winner
  const lockedIndex = locked ? labels.findIndex((l) => l.toLowerCase() === locked.winner.toLowerCase()) : -1;
  const shownIndex = lockedIndex >= 0 ? lockedIndex : winnerIndex;
  useEffect(() => {
    if (lockedIndex >= 0) angle.current = endAngle(lockedIndex, labels.length, 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- labelsKey stands for labels, which is a new array on every render
  }, [lockedIndex, labelsKey]);

  useEffect(() => {
    if (!spinning) paint(shownIndex, shownIndex >= 0 ? (labels[shownIndex] ?? "") : "");
  }, [paint, spinning, shownIndex, labels]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  /** The bot draws its own picture when the website couldn't; ask again until it is there. */
  const waitingForGif = locked !== null && !locked.hasGif;
  useEffect(() => {
    if (!waitingForGif || !locked) return;
    const end = locked.end;
    const timer = setInterval(async () => {
      const result = await actions.winner(end);
      if (result.ok && result.data.hasGif) {
        setWeek((w) => (w.winner?.end === end ? { ...w, winner: result.data } : w));
        setRecords((list) => list.map((r) => (r.end === end ? { ...result.data, message: undefined } : r)));
      }
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `actions` is rebuilt by the page on each render; only the week matters here
  }, [waitingForGif, locked?.end]);

  function spin() {
    if (spinning || labels.length === 0 || frozen) return;
    setWinner(null);
    setWinnerIndex(-1);
    setError(null);
    setPosted(null);
    setPostNote(null);
    setLockNote(null);
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
      }
    };
    frame.current = requestAnimationFrame(step);
  }

  function chooseWeek(end: string) {
    startLoad(async () => {
      const result = await load(end);
      if (!result.ok) return setError(result.error);
      setError(null);
      setLockNote(null);
      setWeek(result.data);
      changeEntries(entriesOf(result.data));
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

  const settingsChanged = autoPost !== settings.autoPost || channelId !== settings.channelId || message.trim() !== settings.message;

  function saveSettings() {
    startSave(async () => {
      const result = await actions.saveSettings(autoPost, channelId, message);
      if (!result.ok) return setSettingsNote({ tone: "error", title: result.error, items: result.problems });
      setSettings(result.data);
      setAutoPost(result.data.autoPost);
      setChannelId(result.data.channelId);
      setMessage(result.data.message);
      setSettingsNote({ tone: "success", title: "Saved." });
    });
  }

  /** Records a freshly locked week everywhere it is shown. */
  function applyLocked(data: WheelWinner) {
    setWeek((w) => ({ ...w, winner: w.end === data.end ? data : w.winner, weeks: w.weeks.map((x) => (x.end === data.end ? { ...x, winner: data.winner } : x)) }));
    setRecords((list) => [{ ...data, message: undefined }, ...list.filter((r) => r.end !== data.end)].sort((a, b) => b.end.localeCompare(a.end)));
  }

  function lockWinner() {
    if (!winner || winnerIndex < 0) return;
    const label = weekLabel(week.start, week.end);
    if (!window.confirm(`Lock in ${winner} as the winner for ${label}?\n\nThe week can't be spun again unless you unlock it, and the winner and their wheel GIF are kept so you can post them any time.`)) return;
    startLock(async () => {
      setLockNote(null);
      const result = await actions.lock(week.end, winner, labels, winnerIndex, false);
      if (!result.ok) return setLockNote({ tone: "error", title: result.error, items: result.problems });
      applyLocked(result.data);
      setLockNote({ tone: "success", title: `${result.data.winner} is locked in for ${label}.${result.picture === "bot" ? " The website couldn't draw the picture, so the bot is drawing its own." : ""}` });
    });
  }

  function unlockWeek(w: WheelWinner) {
    if (!window.confirm(`Unlock ${weekLabel(w.start, w.end)}?\n\nThe winner (${w.winner}) and their GIF are deleted, and the week can be spun again.`)) return;
    startLock(async () => {
      setLockNote(null);
      const result = await actions.unlock(w.end);
      if (!result.ok) return setLockNote({ tone: "error", title: result.error, items: result.problems });
      setRecords(result.data);
      setWeek((cur) => ({ ...cur, winner: cur.end === w.end ? null : cur.winner, weeks: cur.weeks.map((x) => (x.end === w.end ? { ...x, winner: null } : x)) }));
      if (week.end === w.end) {
        changeEntries(fromCappers(week.cappers));
        setLockNote({ tone: "success", title: "Unlocked. The week is open again." });
      }
    });
  }

  /** A past week typed in by hand: no spin, the week's own cappers (plus the winner, if they aren't one) make the wheel its GIF stops on. */
  function recordByHand() {
    const name = handName.trim();
    if (!handDate || !name) return;
    if (new Date(`${handDate}T00:00:00Z`).getUTCDay() !== 3) return setLockNote({ tone: "error", title: "A Citadel week ends on a Wednesday. Pick the Wednesday the week ended." });
    startLock(async () => {
      setLockNote(null);
      const result = await actions.lock(handDate, name, null, null, true);
      if (!result.ok) return setLockNote({ tone: "error", title: result.error, items: result.problems });
      applyLocked(result.data);
      setHandName("");
      setLockNote({ tone: "success", title: `${result.data.winner} recorded for ${weekLabel(result.data.start, result.data.end)}.` });
    });
  }

  function postWinner() {
    if (!winner) return;
    startPost(async () => {
      // a locked week is posted with its own saved picture; otherwise the bot draws one from the wheel as spun
      const result = locked
        ? await actions.postLocked(locked.end)
        : await actions.post(winner, entries.flatMap((e) => Array.from({ length: e.entries }, () => e.name)), week.end);
      if (!result.ok) return setPostNote({ tone: "error", title: result.error, items: result.problems });
      setPosted(winner);
      setPostNote({ tone: "success", title: `Posting ${winner} to #${result.channel}. The GIF takes a few seconds to arrive.` });
    });
  }

  /** The announcement with the GIF's address after it: pasted into Discord, the address turns into the spinning wheel under the message. */
  async function copyAnnouncement(w: WheelWinner) {
    // asked for fresh each time, so a message edited since the week was locked is used
    const fetched = await actions.winner(w.end);
    if (!fetched.ok) return setError(fetched.error);
    const source = fetched.data;
    const url = `${window.location.origin}/api/citadel-wheel/${source.gifToken}.gif`;
    try {
      await navigator.clipboard.writeText(`${source.message ?? ""}\n${url}`);
      setCopiedWeek(w.end);
      setTimeout(() => setCopiedWeek((cur) => (cur === w.end ? null : cur)), 2500);
    } catch {
      setError("Couldn't copy. Allow clipboard access for this page and try again.");
    }
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

  const onLocalhost = useMemo(() => typeof window !== "undefined" && /^(localhost|127\.|\[::1\])/.test(window.location.hostname), []);
  const rowsToShow = records;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted" htmlFor="week">
            Week
          </label>
          <select id="week" className={`${inputClass} max-w-80`} value={week.end} disabled={loading || spinning} onChange={(ev) => chooseWeek(ev.target.value)}>
            {week.weeks.map((w) => (
              <option key={w.end} value={w.end}>
                {w.winner ? "🔒 " : ""}
                {w.start} to {w.end}
                {w.winner ? ` · ${w.winner}` : ""}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted">{labels.length === 0 ? "Nobody" : `${total} ${total === 1 ? "entry" : "entries"}`} on the wheel</span>
        </div>
        {(week.leftOut.length > 0 || week.merged.length > 0) && !frozen && (
          <div className="space-y-1 text-xs text-muted">
            {week.leftOut.length > 0 && (
              <p>
                <span className="font-medium text-foreground/80">Left off (staff):</span> {week.leftOut.map((l) => `${l.name} (${l.reason})`).join(", ")}
              </p>
            )}
            {week.merged.length > 0 && (
              <p>
                <span className="font-medium text-foreground/80">One entry per person:</span> {week.merged.map((m) => m.accounts.join(" + ")).join(", ")}
              </p>
            )}
          </div>
        )}

        {error && <Notice tone="error" title={error} />}

        <div className="relative mx-auto w-full max-w-[760px]">
          <canvas ref={canvas} style={{ width: "100%", aspectRatio: "1 / 1" }} aria-label="Wheel of names" />
          {labels.length === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-muted">Nobody on the wheel yet.</p>}
        </div>

        {locked ? (
          <div className="mx-auto max-w-[760px] space-y-3 rounded-xl border border-gold/50 bg-gold/5 p-4">
            <p className="text-center text-lg font-semibold text-gold">🔒 {locked.winner} won the week of {weekLabel(locked.start, locked.end)}</p>
            <p className="text-center text-xs text-muted">
              Locked {when(locked.lockedAt)}
              {locked.lockedByName ? ` by ${locked.lockedByName}` : ""}
              {locked.method === "MANUAL" ? " · entered by hand" : locked.method === "AUTO" ? " · picked automatically" : ""}
              {locked.gifSource ? ` · picture drawn by the ${locked.gifSource === "WEBSITE" ? "website" : "bot"}` : ""}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" className={primaryButton} disabled={!locked.hasGif} onClick={() => copyAnnouncement(locked)}>
                {copiedWeek === locked.end ? "Copied" : "Copy message with the GIF"}
              </button>
              <a className={`${ghostButton} ${locked.hasGif ? "" : "pointer-events-none opacity-50"}`} href={`${gifPath(locked)}?download=1`} download="citadel-wheel.gif">
                Download the GIF
              </a>
            </div>
            {!locked.hasGif && <p className="text-center text-xs text-muted">The wheel GIF is still being drawn. This updates by itself.</p>}
            <p className="text-center text-xs text-muted">
              Paste the copied text into the channel and add anything else for the week. The address at the end becomes the spinning wheel.
              {onLocalhost ? " (You're on a local copy of the site, so Discord can't open that address from here. It works from the live site.)" : ""}
            </p>
            {locked.hasGif && (
              <details>
                <summary className="cursor-pointer text-center text-xs text-muted">Preview the GIF</summary>
                <img src={gifPath(locked)} alt={`The wheel landing on ${locked.winner}`} className="mx-auto mt-2 max-h-96 w-auto rounded-lg" loading="lazy" />
              </details>
            )}
            <details>
              <summary className="cursor-pointer text-center text-xs text-muted">More</summary>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                {settings.channelId && (
                  <button type="button" className={ghostButton} disabled={posting || posted === locked.winner} onClick={postWinner}>
                    {posting ? "Posting..." : posted === locked.winner ? "Posted" : "📣 Post to the announcement channel"}
                  </button>
                )}
                <button type="button" className="text-sm text-red-400 underline" disabled={locking} onClick={() => unlockWeek(locked)}>
                  Unlock this week
                </button>
              </div>
            </details>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" className={primaryButton} disabled={spinning || labels.length === 0} onClick={spin}>
                {spinning ? "Spinning..." : winner ? "Spin again" : "Spin the wheel"}
              </button>
              {winner && !spinning && (
                <button type="button" className={primaryButton} disabled={locking} onClick={lockWinner}>
                  {locking ? "Locking..." : "🔒 Lock in winner"}
                </button>
              )}
              {winner && !spinning && (
                <button type="button" className={ghostButton} onClick={() => changeEntries(entries.filter((e) => e.name !== winner))}>
                  Take {winner} off the wheel
                </button>
              )}
              {winner && !spinning && settings.channelId && (
                <button type="button" className={ghostButton} disabled={posting || posted === winner} onClick={postWinner}>
                  {posting ? "Posting..." : posted === winner ? "Posted" : "📣 Post winner"}
                </button>
              )}
            </div>
            {winner && !spinning && <p className="text-center text-lg font-semibold text-gold">The wheel landed on {winner}</p>}
            {winner && !spinning && <p className="text-center text-xs text-muted">Not final until you lock it in. Locking keeps the winner and their GIF for this week.</p>}
          </>
        )}
        {lockNote && <Notice tone={lockNote.tone} title={lockNote.title} items={lockNote.items} />}
        {postNote && <Notice tone={postNote.tone} title={postNote.title} items={postNote.items} />}

        <details className="rounded-xl border border-surface-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold">Past winners ({rowsToShow.length})</summary>
          <div className="mt-3 space-y-3">
            {rowsToShow.length === 0 ? (
              <p className="text-sm text-muted">No week has been locked yet.</p>
            ) : (
              <ul className="divide-y divide-surface-border text-sm">
                {rowsToShow.map((r) => (
                  <li key={r.end} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <span className="font-medium">{r.winner}</span>
                      <span className="ml-2 text-xs text-muted">{weekLabel(r.start, r.end)}</span>
                      {r.method === "MANUAL" && <span className="ml-2 text-xs text-muted">entered by hand</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-xs">
                      <button type="button" className="text-gold underline disabled:opacity-50" disabled={!r.hasGif} onClick={() => copyAnnouncement(r)}>
                        {copiedWeek === r.end ? "Copied" : "Copy message"}
                      </button>
                      {r.hasGif ? (
                        <a className="text-gold underline" href={`${gifPath(r)}?download=1`} download="citadel-wheel.gif">
                          GIF
                        </a>
                      ) : (
                        <span className="text-muted">drawing…</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <details className="border-t border-surface-border pt-3">
              <summary className="cursor-pointer text-xs text-muted">Record a past week</summary>
              <div className="mt-2 space-y-2">
                <p className="text-xs text-muted">For weeks before you started locking winners here. Pick the Wednesday that week ended and type the winner. A GIF is drawn that lands on them.</p>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-xs text-muted">
                    Week ended (a Wednesday)
                    <input type="date" className={`${inputClass} mt-1`} value={handDate} onChange={(ev) => setHandDate(ev.target.value)} />
                  </label>
                  <label className="min-w-0 flex-1 text-xs text-muted">
                    Winner
                    <input className={`${inputClass} mt-1`} value={handName} maxLength={40} onChange={(ev) => setHandName(ev.target.value)} placeholder="RuneScape name" />
                  </label>
                  <button type="button" className={ghostButton} disabled={locking || !handDate || !handName.trim()} onClick={recordByHand}>
                    {locking ? "Saving..." : "Record"}
                  </button>
                </div>
              </div>
            </details>
          </div>
        </details>
      </section>

      <aside className="min-w-0 space-y-5">
        <div className="space-y-2 rounded-xl border border-surface-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Add entries</h2>
          <textarea
            className={`${inputClass} min-h-24`}
            placeholder={"Axley\nBerserker87 x2\n(one name per line; x2 gives two entries)"}
            value={extrasText}
            disabled={frozen}
            onChange={(ev) => setExtrasText(ev.target.value)}
          />
          {problems.length > 0 && <p className="text-xs text-red-400">{problems.join(" ")}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ghostButton} disabled={spinning || frozen || !extrasText.trim()} onClick={addExtras}>
              Add to the wheel
            </button>
            <button type="button" className={ghostButton} disabled={spinning || frozen} onClick={() => changeEntries(fromCappers(week.cappers))}>
              Reset to who capped
            </button>
          </div>
          {frozen && <p className="text-xs text-muted">This week is locked. Unlock it to change the wheel.</p>}
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
            <ul className="divide-y divide-surface-border text-sm">
              {entries.map((e) => (
                <li key={e.name} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0 truncate">{e.name}</span>
                  <span className="flex shrink-0 items-center gap-2 tabular-nums">
                    {frozen ? (
                      e.entries
                    ) : (
                      <>
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
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-surface-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Announcing winners</h2>
          <p className="text-xs text-muted">
            For posting from the bot instead of pasting it yourself. The winner is posted in the channel below with your message and the wheel GIF. Copy message with the GIF
            (under a locked winner) uses the same message.
          </p>
          <FormField label="Channel" as="group">
            <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={channelId} onChange={setChannelId} none="No channel chosen" />
          </FormField>
          <FormField label="Message" as="group">
            <textarea className={`${inputClass} min-h-28`} maxLength={settings.maxLength} value={message} onChange={(ev) => setMessage(ev.target.value)} />
            <p className="mt-1 text-xs text-muted">
              Fills in <code>{"{winner}"}</code> (the name), <code>{"{mention}"}</code> (pings them if their account is linked), <code>{"{week}"}</code> and{" "}
              <code>{"{entries}"}</code>. <button type="button" className="text-gold underline" onClick={() => setMessage(settings.defaultMessage)}>Use the default</button>
            </p>
          </FormField>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={autoPost} onChange={(ev) => setAutoPost(ev.target.checked)} />
            <span>
              Post a winner automatically when the weekly Citadel list is made
              <span className="block text-xs text-muted">Wednesday at 12:00 UTC, or when the list is sent now. The winner is locked in for the week, and a week you already locked is left alone. Off by default.</span>
            </span>
          </label>
          {settingsNote && <Notice tone={settingsNote.tone} title={settingsNote.title} items={settingsNote.items} />}
          <button type="button" className={primaryButton} disabled={saving || !settingsChanged} onClick={saveSettings}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </aside>
    </div>
  );
}
