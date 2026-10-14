"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import type { CitadelCappers, WheelSettings } from "@/lib/citadelTypes";
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

type Load = (end: string | null) => Promise<{ ok: true; data: CitadelCappers } | { ok: false; error: string }>;

const SIZE = 760;
const SPIN_MS = 7000;

type Actions = {
  saveSettings: (autoPost: boolean, channelId: string | null, message: string) => Promise<{ ok: true; data: WheelSettings } | { ok: false; error: string; problems: string[] }>;
  post: (winner: string, entries: string[], end: string) => Promise<{ ok: true; channel: string } | { ok: false; error: string; problems: string[] }>;
};

const fromCappers = (names: string[]): WheelEntry[] => names.map((name) => ({ name, entries: 1 }));

/**
 * A wheel of names for the week's Citadel cappers: add or remove names, give someone an extra entry (a prize, a make-up for a missed cap), spin it, and
 * keep a list of who won. Everything runs in the browser except fetching who capped.
 */
export function CitadelWheel({
  initial,
  settings: initialSettings,
  structure,
  load,
  actions,
}: {
  initial: CitadelCappers;
  settings: WheelSettings;
  structure: GuildStructure;
  load: Load;
  actions: Actions;
}) {
  const [week, setWeek] = useState(initial);
  const [settings, setSettings] = useState(initialSettings);
  const [autoPost, setAutoPost] = useState(initialSettings.autoPost);
  const [channelId, setChannelId] = useState<string | null>(initialSettings.channelId);
  const [message, setMessage] = useState(initialSettings.message);
  const [settingsNote, setSettingsNote] = useState<{ tone: "error" | "success"; title: string; items?: string[] } | null>(null);
  const [saving, startSave] = useTransition();
  const [posted, setPosted] = useState<string | null>(null);
  const [postNote, setPostNote] = useState<{ tone: "error" | "success"; title: string; items?: string[] } | null>(null);
  const [posting, startPost] = useTransition();
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
    setPosted(null);
    setPostNote(null);
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
    setPosted(null);
    setPostNote(null);
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

  function postWinner() {
    if (!winner) return;
    // every entry as a name once per entry, so the bot can draw the same wheel and stop its GIF on the winner
    const all = entries.flatMap((e) => Array.from({ length: e.entries }, () => e.name));
    startPost(async () => {
      const result = await actions.post(winner, all, week.end);
      if (!result.ok) return setPostNote({ tone: "error", title: result.error, items: result.problems });
      setPosted(winner);
      setPostNote({ tone: "success", title: `Posting ${winner} to #${result.channel}. The GIF takes a few seconds to draw.` });
    });
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
          <span className="text-sm text-muted">{week.cappers.length} on the wheel</span>
        </div>
        {(week.leftOut.length > 0 || week.merged.length > 0) && (
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

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" className={primaryButton} disabled={spinning || labels.length === 0} onClick={spin}>
            {spinning ? "Spinning..." : winner ? "Spin again" : "Spin the wheel"}
          </button>
          {winner && !spinning && (
            <button type="button" className={ghostButton} onClick={() => changeEntries(entries.filter((e) => e.name !== winner))}>
              Take {winner} off the wheel
            </button>
          )}
          {winner && !spinning && (
            <button type="button" className={ghostButton} disabled={posting || posted === winner || !settings.channelId} onClick={postWinner}>
              {posting ? "Posting..." : posted === winner ? "Posted" : "📣 Post winner"}
            </button>
          )}
        </div>
        {winner && !spinning && <p className="text-center text-lg font-semibold text-gold">The wheel landed on {winner}</p>}
        {winner && !spinning && !settings.channelId && <p className="text-center text-xs text-muted">Choose the channel in Announcing winners (on the right) to post this.</p>}
        {postNote && <Notice tone={postNote.tone} title={postNote.title} items={postNote.items} />}
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
            <ul className="divide-y divide-surface-border text-sm">
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

        <div className="space-y-3 rounded-xl border border-surface-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Announcing winners</h2>
          <p className="text-xs text-muted">
            The winner is posted in the channel below with your message and a GIF of the wheel. Use Post winner under the wheel, or the button under a spin in Discord.
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
              <span className="block text-xs text-muted">Wednesday at 12:00 UTC, or when the list is sent now. Staff are left off and everyone gets one entry.</span>
            </span>
          </label>
          {settingsNote && <Notice tone={settingsNote.tone} title={settingsNote.title} items={settingsNote.items} />}
          <button type="button" className={primaryButton} disabled={saving || !settingsChanged} onClick={saveSettings}>
            {saving ? "Saving..." : "Save"}
          </button>
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
