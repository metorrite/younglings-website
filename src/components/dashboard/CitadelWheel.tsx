"use client";

/* eslint-disable @next/next/no-img-element -- the wheel's GIF is a one-off picture served by our own route; next/image would re-encode (and flatten) it */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import type { CitadelCappers, CofferHolderInfo, WheelSettings, WheelWeek, WheelWinner } from "@/lib/citadelTypes";
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
const MAX_WINNERS = 10;

type PrizeInput = { amount: string; paidBy: string; recipient: string | null; note: string };

type Actions = {
  saveSettings: (autoPost: boolean, channelId: string | null, message: string) => Promise<{ ok: true; data: WheelSettings } | Failure>;
  post: (winner: string, entries: string[], end: string) => Promise<{ ok: true; channel: string } | Failure>;
  /** Locks the next place of a week. `labels` and `winnerIndex` are the wheel as spun. */
  lock: (end: string, winner: string, labels: string[], winnerIndex: number) => Promise<{ ok: true; data: WheelWeek; picture: "website" | "bot" } | Failure>;
  /** Records winners of a past week typed in by hand, in order of place. */
  recordPast: (end: string, names: string[]) => Promise<{ ok: true; data: WheelWeek } | Failure>;
  unlock: (end: string) => Promise<{ ok: true; data: WheelWeek[] } | Failure>;
  week: (end: string) => Promise<{ ok: true; data: WheelWeek } | Failure>;
  postLocked: (end: string) => Promise<{ ok: true; channel: string } | Failure>;
  markPrize: (end: string, place: number, given: boolean) => Promise<{ ok: true; data: WheelWeek } | Failure>;
  recordPrize: (end: string, place: number, input: PrizeInput) => Promise<{ ok: true; data: WheelWeek } | Failure>;
  holders: () => Promise<{ ok: true; data: CofferHolderInfo[] } | Failure>;
};

type Note = { tone: "error" | "success"; title: string; items?: string[] };
type Picked = { name: string; labels: string[]; index: number; before: WheelEntry[] };

const fromCappers = (names: string[]): WheelEntry[] => names.map((name) => ({ name, entries: 1 }));

/** The wheel a locked winner was picked from: one entry per slice, names in the order they first appear. */
function fromSlices(slices: string[]): WheelEntry[] {
  const counts = new Map<string, number>();
  for (const s of slices) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts].map(([name, entries]) => ({ name, entries }));
}

const entriesOf = (week: CitadelCappers): WheelEntry[] => (week.locked && week.locked.winners.length > 0 ? fromSlices(week.locked.winners[0].entries) : fromCappers(week.cappers));

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
const gifPath = (w: WheelWinner) => `/api/citadel-wheel/${w.gifToken}.gif`;
const weekLabel = (start: string, end: string) => `${DAY.format(new Date(`${start}T00:00:00Z`))} to ${DAY.format(new Date(`${end}T00:00:00Z`))}`;
const placeLabel = (place: number) => (place === 1 ? "🥇 1st" : place === 2 ? "🥈 2nd" : place === 3 ? "🥉 3rd" : `${place}th`);
const ordinal = (place: number) => (place === 1 ? "1st" : place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`);

/** "5m", "500k", "1.5b", "5,000,000": the same shorthand the bot's /coffer takes. Null when it isn't an amount. */
function parseGp(text: string): number | null {
  const cleaned = text.trim().replace(/[,_\s]/g, "").toLowerCase();
  const match = /^(\d+(?:\.\d+)?)([kmb]?)$/.exec(cleaned);
  if (!match) return null;
  const value = Number(match[1]) * ({ "": 1, k: 1_000, m: 1_000_000, b: 1_000_000_000 }[match[2] as "" | "k" | "m" | "b"]);
  return value > 0 && Number.isFinite(value) ? Math.round(value) : null;
}

function gpText(amount: number): string {
  if (amount >= 1_000_000_000) return `${+(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `${+(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${+(amount / 1_000).toFixed(2)}K`;
  return `${amount}`;
}

/**
 * One locked winner: their place, whether their prize has been given (in words and colour, so it can't be missed), and the buttons to mark it given or
 * record it in the clan coffer. Recording in the coffer asks for the amount and who paid, shows who it goes to, and moves the gp as a giveaway.
 */
function WinnerRow({ w, actions, onWeek, onError }: { w: WheelWinner; actions: Actions; onWeek: (week: WheelWeek) => void; onError: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [holders, setHolders] = useState<CofferHolderInfo[] | null>(null);
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<Note | null>(null);
  const [pending, start] = useTransition();
  const given = w.prize.status === "GIVEN";
  const parsed = parseGp(amount);
  const payer = holders?.find((h) => h.userId === paidBy) ?? null;
  const needsRecipient = w.linkedUser === null;
  const recipientOk = !needsRecipient || /^\d{15,20}$/.test(recipient.trim());
  const short = payer !== null && parsed !== null && payer.balance < parsed;
  const ready = parsed !== null && payer !== null && !short && recipientOk;

  function openForm() {
    setOpen(true);
    setProblem(null);
    if (holders === null) {
      actions.holders().then((r) => {
        if (r.ok) setHolders(r.data);
        else setProblem({ tone: "error", title: r.error, items: r.problems });
      });
    }
  }

  function mark(next: boolean) {
    if (!window.confirm(next ? `Mark ${w.winner}'s prize as given? Use this when it was paid some way other than the clan coffer.` : `Mark ${w.winner}'s prize as not given?`)) return;
    start(async () => {
      const r = await actions.markPrize(w.end, w.place, next);
      if (r.ok) onWeek(r.data);
      else onError(r.error);
    });
  }

  function record() {
    if (parsed === null || payer === null || !ready) return;
    const text = `Record ${gpText(parsed)} gp paid by ${payer.name ?? `user ${payer.userId}`} to ${w.winner}${w.linkedUserName ? ` (${w.linkedUserName})` : ""} in the clan coffer?\n\nThe gp comes out of ${payer.name ?? "their"} balance in the coffer and can't be undone from here.`;
    if (!window.confirm(text)) return;
    start(async () => {
      const r = await actions.recordPrize(w.end, w.place, { amount: amount.trim(), paidBy, recipient: needsRecipient ? recipient.trim() : null, note });
      if (!r.ok) return setProblem({ tone: "error", title: r.error, items: r.problems });
      setOpen(false);
      setAmount("");
      setNote("");
      onWeek(r.data);
    });
  }

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="mr-2 text-sm text-muted">{placeLabel(w.place)}</span>
          <span className="font-medium">{w.winner}</span>
          {w.linkedUserName ? (
            <span className="ml-2 text-xs text-muted">@{w.linkedUserName}</span>
          ) : w.linkedUser ? (
            <span className="ml-2 text-xs text-muted">linked to Discord</span>
          ) : (
            <span className="ml-2 text-xs text-muted">not linked to Discord</span>
          )}
          {w.method === "MANUAL" && <span className="ml-2 text-xs text-muted">entered by hand</span>}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${given ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-300"}`}>
          {given ? "✅ Prize given" : "🎁 Prize not given yet"}
        </span>
      </div>
      {given && (
        <p className="text-xs text-muted">
          {w.prize.amount !== null ? `${gpText(w.prize.amount)} gp` : "Amount not recorded"}
          {w.prize.paidByName ? ` paid by ${w.prize.paidByName}` : ""}
          {w.prize.givenAt ? ` on ${when(w.prize.givenAt)}` : ""}
          {w.prize.givenByName ? ` · recorded by ${w.prize.givenByName}` : ""}
          {w.prize.inCoffer ? " · in the clan coffer" : " · marked by hand"}
          {w.prize.note ? ` · ${w.prize.note}` : ""}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {!given && (
          <>
            <button type="button" className={ghostButton} disabled={pending} onClick={() => mark(true)}>
              Mark prize as given
            </button>
            <button type="button" className={ghostButton} disabled={pending || open} onClick={openForm}>
              Record prize in coffer
            </button>
          </>
        )}
        {given && !w.prize.inCoffer && (
          <button type="button" className="text-gold underline" disabled={pending} onClick={() => mark(false)}>
            Mark as not given
          </button>
        )}
        {w.hasGif ? (
          <a className="text-gold underline" href={`${gifPath(w)}?download=1`} download="citadel-wheel.gif">
            Download GIF
          </a>
        ) : (
          <span className="text-muted">GIF drawing…</span>
        )}
      </div>
      {open && !given && (
        <div className="space-y-3 rounded-lg border border-surface-border p-3">
          <p className="text-sm font-medium">Record the prize in the clan coffer</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Winner</dt>
              <dd>
                {w.winner} · {ordinal(w.place)} place
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Receives it as</dt>
              <dd>{w.linkedUserName ? `@${w.linkedUserName}` : w.linkedUser ? `Discord user ${w.linkedUser}` : "Not linked to a Discord account"}</dd>
            </div>
          </dl>
          {needsRecipient && (
            <label className="block text-xs text-muted">
              Their Discord user id (their RuneScape name isn&apos;t linked with /rs)
              <input className={`${inputClass} mt-1`} inputMode="numeric" placeholder="e.g. 123456789012345678" value={recipient} onChange={(ev) => setRecipient(ev.target.value)} />
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              Amount paid (gp)
              <input className={`${inputClass} mt-1`} placeholder="5m, 500k or 5000000" value={amount} onChange={(ev) => setAmount(ev.target.value)} />
            </label>
            <label className="block text-xs text-muted">
              Who paid it
              <select className={`${inputClass} mt-1`} value={paidBy} onChange={(ev) => setPaidBy(ev.target.value)}>
                <option value="">{holders === null ? "Loading…" : holders.length === 0 ? "Nobody holds gp in the coffer" : "Choose who paid"}</option>
                {holders?.map((h) => (
                  <option key={h.userId} value={h.userId}>
                    {h.name ?? `User ${h.userId}`} · holds {gpText(h.balance)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs text-muted">
            Note (optional)
            <input className={`${inputClass} mt-1`} maxLength={200} value={note} onChange={(ev) => setNote(ev.target.value)} />
          </label>
          {amount.trim() !== "" && parsed === null && <p className="text-xs text-red-400">That isn&apos;t an amount. Use 5m, 500k or 5000000.</p>}
          {short && payer && (
            <p className="text-xs text-red-400">
              {payer.name ?? "They"} only hold {gpText(payer.balance)} in the coffer, which isn&apos;t enough for {gpText(parsed ?? 0)}.
            </p>
          )}
          {ready && parsed !== null && payer !== null && (
            <p className="text-sm">
              Will record <span className="font-semibold text-gold">{gpText(parsed)} gp</span> paid by <span className="font-semibold">{payer.name ?? `user ${payer.userId}`}</span> to{" "}
              <span className="font-semibold">{w.winner}</span> in the clan coffer.
            </p>
          )}
          {problem && <Notice tone={problem.tone} title={problem.title} items={problem.items} />}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButton} disabled={pending || !ready} onClick={record}>
              {pending ? "Recording…" : "Record in coffer"}
            </button>
            <button type="button" className="text-sm text-muted underline" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * A wheel of names for the week's Citadel cappers: add or remove names, give someone an extra entry (a prize, a make-up for a missed cap), spin it, and
 * lock in the winner, or several winners for a bigger week (each spin takes the winner off the wheel before the next). A locked week keeps its winners and
 * a GIF of the wheel landing on each, so the announcement (the server's message with the GIF addresses after it) can be copied again at any time and
 * pasted into Discord with anything else to say. Each winner also has a prize status, and a prize can be recorded in the clan coffer. Everything runs in
 * the browser except fetching who capped, locking, drawing the GIF and the coffer.
 */
export function CitadelWheel({
  initial,
  weeks: initialWeeks,
  settings: initialSettings,
  structure,
  load,
  actions,
}: {
  initial: CitadelCappers;
  weeks: WheelWeek[];
  settings: WheelSettings;
  structure: GuildStructure;
  load: Load;
  actions: Actions;
}) {
  const [week, setWeek] = useState(initial);
  const [records, setRecords] = useState(initialWeeks);
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
  const [winnersWanted, setWinnersWanted] = useState(1);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedWeek, setCopiedWeek] = useState<string | null>(null);
  // Discord shows a pasted address as text and the picture under the whole message; as a link with an invisible name only the picture shows
  const [hideLink, setHideLink] = useState(true);
  const [handDate, setHandDate] = useState("");
  const [handNames, setHandNames] = useState("");
  const [loading, startLoad] = useTransition();
  const canvas = useRef<HTMLCanvasElement>(null);
  const angle = useRef(0);
  const frame = useRef<number | null>(null);

  const locked = week.locked;
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

  // a locked week shows the wheel its first winner was picked from, resting on them
  const firstWinner = locked?.winners[0]?.winner ?? null;
  const lockedIndex = firstWinner ? labels.findIndex((l) => l.toLowerCase() === firstWinner.toLowerCase()) : -1;
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

  /** Records a locked week (or one whose prize changed) everywhere it is shown. */
  const applyWeek = useCallback((data: WheelWeek) => {
    setWeek((w) => ({ ...w, locked: w.end === data.end ? data : w.locked, weeks: w.weeks.map((x) => (x.end === data.end ? { ...x, winners: data.winners.map((y) => y.winner) } : x)) }));
    setRecords((list) => [{ ...data, message: undefined }, ...list.filter((r) => r.end !== data.end)].sort((a, b) => b.end.localeCompare(a.end)));
  }, []);

  /** The bot draws its own pictures when the website couldn't; ask again until they are there. */
  const waitingForGif = locked !== null && locked.winners.some((w) => !w.hasGif);
  const waitingEnd = locked?.end ?? null;
  useEffect(() => {
    if (!waitingForGif || !waitingEnd) return;
    const timer = setInterval(async () => {
      const result = await actions.week(waitingEnd);
      if (result.ok && result.data.winners.every((w) => w.hasGif)) applyWeek(result.data);
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `actions` is rebuilt by the page on each render; only the week matters here
  }, [waitingForGif, waitingEnd, applyWeek]);

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
      setPicked([]);
      setWinnersWanted(1);
      changeEntries(entriesOf(result.data));
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

  /** Keeps the winner just spun as the next place and takes them off the wheel, ready to spin for the next one. */
  function keepAndContinue() {
    if (!winner || winnerIndex < 0) return;
    setPicked((list) => [...list, { name: winner, labels, index: winnerIndex, before: entries }]);
    changeEntries(entries.filter((e) => e.name.toLowerCase() !== winner.toLowerCase()));
  }

  function undoLastPick() {
    const last = picked[picked.length - 1];
    if (!last) return;
    setPicked(picked.slice(0, -1));
    changeEntries(last.before);
  }

  function lockWinners() {
    if (!winner || winnerIndex < 0) return;
    const batch: Picked[] = [...picked, { name: winner, labels, index: winnerIndex, before: entries }];
    const label = weekLabel(week.start, week.end);
    const names = batch.map((b, i) => `${ordinal(i + 1)}: ${b.name}`).join("\n");
    if (!window.confirm(`Lock in ${batch.length === 1 ? "this winner" : `these ${batch.length} winners`} for ${label}?\n\n${names}\n\nThe week can't be spun again unless you unlock it, and each winner's wheel GIF is kept so you can post it any time.`)) return;
    startLock(async () => {
      setLockNote(null);
      let latest: WheelWeek | null = null;
      let fallback = false;
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const result = await actions.lock(week.end, item.name, item.labels, item.index);
        if (!result.ok) {
          if (latest) applyWeek(latest);
          setPicked(batch.slice(i));
          return setLockNote({ tone: "error", title: i === 0 ? result.error : `${i} of ${batch.length} winners were locked, then: ${result.error}`, items: result.problems });
        }
        latest = result.data;
        if (result.picture === "bot") fallback = true;
      }
      if (latest) applyWeek(latest);
      setPicked([]);
      setLockNote({ tone: "success", title: `${batch.length === 1 ? batch[0].name : `${batch.length} winners`} locked in for ${label}.${fallback ? " The website couldn't draw some pictures, so the bot is drawing its own." : ""}` });
    });
  }

  function unlockWeek(w: WheelWeek) {
    const label = weekLabel(w.start, w.end);
    if (!window.confirm(`Unlock ${label}?\n\nThe winner${w.winners.length === 1 ? "" : "s"} (${w.winners.map((x) => x.winner).join(", ")}) and their GIFs are deleted, and the week can be spun again.`)) return;
    startLock(async () => {
      setLockNote(null);
      const result = await actions.unlock(w.end);
      if (!result.ok) return setLockNote({ tone: "error", title: result.error, items: result.problems });
      setRecords(result.data);
      setWeek((cur) => ({ ...cur, locked: cur.end === w.end ? null : cur.locked, weeks: cur.weeks.map((x) => (x.end === w.end ? { ...x, winners: [] } : x)) }));
      if (week.end === w.end) {
        setPicked([]);
        changeEntries(fromCappers(week.cappers));
        setLockNote({ tone: "success", title: "Unlocked. The week is open again." });
      }
    });
  }

  /** A past week typed in by hand: no spin, the week's own cappers make the wheel each GIF stops on. */
  function recordByHand() {
    const names = handNames.split("\n").map((n) => n.trim()).filter(Boolean);
    if (!handDate || names.length === 0) return;
    if (new Date(`${handDate}T00:00:00Z`).getUTCDay() !== 3) return setLockNote({ tone: "error", title: "A Citadel week ends on a Wednesday. Pick the Wednesday the week ended." });
    if (names.length > MAX_WINNERS) return setLockNote({ tone: "error", title: `A week can have up to ${MAX_WINNERS} winners.` });
    startLock(async () => {
      setLockNote(null);
      const result = await actions.recordPast(handDate, names);
      if (!result.ok) return setLockNote({ tone: "error", title: result.error, items: result.problems });
      applyWeek(result.data);
      setHandNames("");
      setLockNote({ tone: "success", title: `${names.length === 1 ? names[0] : `${names.length} winners`} recorded for ${weekLabel(result.data.start, result.data.end)}.` });
    });
  }

  function postWinner() {
    if (!winner) return;
    startPost(async () => {
      const result = locked
        ? await actions.postLocked(locked.end)
        : await actions.post(winner, entries.flatMap((e) => Array.from({ length: e.entries }, () => e.name)), week.end);
      if (!result.ok) return setPostNote({ tone: "error", title: result.error, items: result.problems });
      setPosted(winner);
      setPostNote({ tone: "success", title: `Posting to #${result.channel}. The GIF${locked && locked.winners.length > 1 ? "s take" : " takes"} a few seconds to arrive.` });
    });
  }

  /** The announcement with each GIF's address after it: pasted into Discord, an address turns into the spinning wheel under the message. */
  async function copyAnnouncement(w: { end: string }) {
    // asked for fresh each time, so a message edited since the week was locked is used
    const fetched = await actions.week(w.end);
    if (!fetched.ok) return setError(fetched.error);
    const source = fetched.data;
    const invisible = String.fromCharCode(0x200b);
    const urls = source.winners.map((x) => {
      const address = `${window.location.origin}/api/citadel-wheel/${x.gifToken}.gif`;
      return hideLink ? `[${invisible}](${address})` : address;
    });
    try {
      // {wheel} in the message marks where the GIF addresses go; without it they follow the message
      const message = source.message ?? "";
      const text = message.includes("{wheel}") ? message.replaceAll("{wheel}", urls.join("\n")) : [message, ...urls].join("\n");
      await navigator.clipboard.writeText(text);
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
  const nextPlace = picked.length + 1;
  const moreToPick = winnersWanted > nextPlace;
  const prizesPending = (w: WheelWeek) => w.winners.filter((x) => x.prize.status === "PENDING").length;

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
                {w.winners.length > 0 ? "🔒 " : ""}
                {w.start} to {w.end}
                {w.winners.length > 0 ? ` · ${w.winners.join(", ")}` : ""}
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
            <p className="text-center text-lg font-semibold text-gold">
              🔒 {locked.winners.length === 1 ? `${locked.winners[0].winner} won` : `${locked.winners.length} winners for`} the week of {weekLabel(locked.start, locked.end)}
            </p>
            <p className="text-center text-xs text-muted">
              Locked {when(locked.winners[0].lockedAt)}
              {locked.winners[0].lockedByName ? ` by ${locked.winners[0].lockedByName}` : ""}
              {locked.winners[0].method === "AUTO" ? " · picked automatically" : ""}
              {prizesPending(locked) > 0 ? ` · ${prizesPending(locked)} prize${prizesPending(locked) === 1 ? "" : "s"} not given yet` : " · every prize given"}
            </p>
            <ul className="divide-y divide-surface-border">
              {locked.winners.map((w) => (
                <WinnerRow key={w.place} w={w} actions={actions} onWeek={applyWeek} onError={setError} />
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" className={primaryButton} disabled={waitingForGif} onClick={() => copyAnnouncement(locked)}>
                {copiedWeek === locked.end ? "Copied" : locked.winners.length > 1 ? "Copy message with the GIFs" : "Copy message with the GIF"}
              </button>
            </div>
            <label className="flex items-center justify-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={hideLink} onChange={(ev) => setHideLink(ev.target.checked)} />
              Hide the address in the message (only the wheel shows)
            </label>
            {waitingForGif && <p className="text-center text-xs text-muted">A wheel GIF is still being drawn. This updates by itself.</p>}
            <p className="text-center text-xs text-muted">
              Paste the copied text into the channel and add anything else for the week. Discord always shows the wheel under the whole message, wherever{" "}
              <code>{"{wheel}"}</code> is. If the address still shows as odd text after pasting, untick the box and copy again.
              {onLocalhost ? " (You're on a local copy of the site, so Discord can't open those addresses from here. It works from the live site.)" : ""}
            </p>
            {!waitingForGif && (
              <details>
                <summary className="cursor-pointer text-center text-xs text-muted">Preview the GIF{locked.winners.length > 1 ? "s" : ""}</summary>
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  {locked.winners.map((w) => (
                    <figure key={w.place} className="text-center text-xs text-muted">
                      <img src={gifPath(w)} alt={`The wheel landing on ${w.winner}`} className="mx-auto max-h-80 w-auto rounded-lg" loading="lazy" />
                      <figcaption className="mt-1">
                        {ordinal(w.place)}: {w.winner}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </details>
            )}
            <details>
              <summary className="cursor-pointer text-center text-xs text-muted">More</summary>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                {settings.channelId && (
                  <button type="button" className={ghostButton} disabled={posting || posted === locked.winners[0].winner} onClick={postWinner}>
                    {posting ? "Posting..." : posted === locked.winners[0].winner ? "Posted" : "📣 Post to the announcement channel"}
                  </button>
                )}
                <button type="button" className="text-sm text-red-400 underline" disabled={locking} onClick={() => unlockWeek(locked)}>
                  Unlock this week
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-muted">A week can&apos;t be unlocked once a prize has been recorded as given.</p>
            </details>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" className={primaryButton} disabled={spinning || labels.length === 0} onClick={spin}>
                {spinning ? "Spinning..." : winner ? "Spin again" : picked.length > 0 ? `Spin for ${ordinal(nextPlace)}` : "Spin the wheel"}
              </button>
              {winner && !spinning && moreToPick && (
                <button type="button" className={primaryButton} onClick={keepAndContinue}>
                  Keep {winner} as {ordinal(nextPlace)}, spin for {ordinal(nextPlace + 1)}
                </button>
              )}
              {winner && !spinning && !moreToPick && (
                <button type="button" className={primaryButton} disabled={locking} onClick={lockWinners}>
                  {locking ? "Locking..." : nextPlace > 1 ? `🔒 Lock in ${nextPlace} winners` : "🔒 Lock in winner"}
                </button>
              )}
              {winner && !spinning && (
                <button type="button" className={ghostButton} onClick={() => changeEntries(entries.filter((e) => e.name !== winner))}>
                  Take {winner} off the wheel
                </button>
              )}
              {winner && !spinning && winnersWanted === 1 && settings.channelId && (
                <button type="button" className={ghostButton} disabled={posting || posted === winner} onClick={postWinner}>
                  {posting ? "Posting..." : posted === winner ? "Posted" : "📣 Post winner"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <label className="flex items-center gap-2 text-muted">
                Winners this week
                <select className={`${inputClass} w-20!`} value={winnersWanted} disabled={spinning || locking} onChange={(ev) => setWinnersWanted(Number(ev.target.value))}>
                  {Array.from({ length: MAX_WINNERS }, (_, i) => i + 1)
                    .filter((n) => n >= nextPlace)
                    .map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                </select>
              </label>
              {winnersWanted > 1 && <span className="text-xs text-muted">Each winner comes off the wheel before the next spin.</span>}
            </div>
            {picked.length > 0 && (
              <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                <span className="text-muted">Picked so far:</span>
                {picked.map((p, i) => (
                  <span key={p.name} className="font-medium">
                    {placeLabel(i + 1)} {p.name}
                  </span>
                ))}
                <button type="button" className="text-xs text-gold underline" disabled={spinning || locking} onClick={undoLastPick}>
                  Undo {picked[picked.length - 1].name}
                </button>
              </div>
            )}
            {winner && !spinning && <p className="text-center text-lg font-semibold text-gold">The wheel landed on {winner}</p>}
            {winner && !spinning && <p className="text-center text-xs text-muted">Not final until you lock it in. Locking keeps the winner{nextPlace > 1 || moreToPick ? "s" : ""} and each wheel GIF for this week.</p>}
          </>
        )}
        {lockNote && <Notice tone={lockNote.tone} title={lockNote.title} items={lockNote.items} />}
        {postNote && <Notice tone={postNote.tone} title={postNote.title} items={postNote.items} />}

        <details className="rounded-xl border border-surface-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Past winners ({records.length} {records.length === 1 ? "week" : "weeks"}
            {records.some((r) => prizesPending(r) > 0) ? `, ${records.reduce((n, r) => n + prizesPending(r), 0)} prizes not given` : ""})
          </summary>
          <div className="mt-3 space-y-4">
            {records.length === 0 ? (
              <p className="text-sm text-muted">No week has been locked yet.</p>
            ) : (
              records.map((r) => (
                <div key={r.end} className="rounded-lg border border-surface-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{weekLabel(r.start, r.end)}</span>
                    <button type="button" className="text-xs text-gold underline disabled:opacity-50" disabled={r.winners.some((x) => !x.hasGif)} onClick={() => copyAnnouncement(r)}>
                      {copiedWeek === r.end ? "Copied" : `Copy message with the GIF${r.winners.length > 1 ? "s" : ""}`}
                    </button>
                  </div>
                  <ul className="divide-y divide-surface-border">
                    {r.winners.map((w) => (
                      <WinnerRow key={w.place} w={w} actions={actions} onWeek={applyWeek} onError={setError} />
                    ))}
                  </ul>
                </div>
              ))
            )}
            <details className="border-t border-surface-border pt-3">
              <summary className="cursor-pointer text-xs text-muted">Record a past week</summary>
              <div className="mt-2 space-y-2">
                <p className="text-xs text-muted">
                  For weeks before you started locking winners here. Pick the Wednesday that week ended and type the winners, one per line in order of place. A GIF is drawn that lands on each one.
                </p>
                <div className="flex flex-wrap items-start gap-2">
                  <label className="text-xs text-muted">
                    Week ended (a Wednesday)
                    <input type="date" className={`${inputClass} mt-1`} value={handDate} onChange={(ev) => setHandDate(ev.target.value)} />
                  </label>
                  <label className="min-w-0 flex-1 text-xs text-muted">
                    Winners
                    <textarea className={`${inputClass} mt-1 min-h-20`} value={handNames} placeholder={"RuneScape name\n(second place on the next line)"} onChange={(ev) => setHandNames(ev.target.value)} />
                  </label>
                  <button type="button" className={`${ghostButton} mt-5`} disabled={locking || !handDate || !handNames.trim()} onClick={recordByHand}>
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
            <button
              type="button"
              className={ghostButton}
              disabled={spinning || frozen}
              onClick={() => {
                setPicked([]);
                changeEntries(fromCappers(week.cappers));
              }}
            >
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
              Fills in <code>{"{winner}"}</code> (the name; with several winners, all of them: A, B and C), <code>{"{mention}"}</code> (pings them if their account is linked),{" "}
              <code>{"{week}"}</code> and <code>{"{entries}"}</code>. <code>{"{wheel}"}</code> is where the GIF address goes when you copy the message; without it the address comes last. Discord shows the wheel under the whole message either way, so <code>{"{wheel}"}</code> has to be the last thing in the message. When the bot posts, the GIF is attached and <code>{"{wheel}"}</code> is left out. <button type="button" className="text-gold underline" onClick={() => setMessage(settings.defaultMessage)}>Use the default</button>
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
