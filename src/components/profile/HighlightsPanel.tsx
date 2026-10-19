"use client";

import { useState, useTransition } from "react";
import { addHighlightAction, ignoreHighlightChannelAction, removeHighlightAction, type ActionResult } from "@/app/profile/actions";
import type { MyHighlights } from "@/lib/member";

const field = "w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold disabled:opacity-50";
const primary = "rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-50";

type Actions = {
  add: (word: string, wholeWord: boolean) => Promise<ActionResult<MyHighlights>>;
  remove: (id: string) => Promise<ActionResult<MyHighlights>>;
  ignore: (channelId: string, ignored: boolean) => Promise<ActionResult<MyHighlights>>;
};
const real: Actions = { add: addHighlightAction, remove: removeHighlightAction, ignore: ignoreHighlightChannelAction };

/** A member's own Highlights words and the channels they skip. The same list `/highlight` in Discord changes. */
export function HighlightsPanel({ initial, actions = real }: { initial: MyHighlights; actions?: Actions }) {
  const [state, setState] = useState(initial);
  const [word, setWord] = useState("");
  const [whole, setWhole] = useState(true);
  const [channel, setChannel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(task: () => Promise<ActionResult<MyHighlights>>, after?: () => void) {
    setError(null);
    start(async () => {
      const result = await task();
      if (!result.ok) return setError(result.error);
      setState(result.data);
      after?.();
    });
  }

  if (!state.enabled) {
    return <p className="rounded-lg border border-dashed border-surface-border p-4 text-sm text-muted">Highlights aren&apos;t switched on in this server. An admin can turn them on from the dashboard.</p>;
  }
  if (!state.usable) {
    return <p className="rounded-lg border border-dashed border-surface-border p-4 text-sm text-muted">{state.refusal ?? "You can't use Highlights in this server."}</p>;
  }

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => actions.add(word, whole), () => setWord(""));
        }}
      >
        <label className="min-w-48 flex-1 text-sm">
          <span className="mb-1 block text-xs text-muted">Word or phrase</span>
          <input className={field} value={word} maxLength={state.maxWord} onChange={(e) => setWord(e.target.value)} disabled={state.words.length >= state.max} />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} className="accent-[var(--color-gold)]" />
          Whole word only
        </label>
        <button type="submit" className={primary} disabled={pending || word.trim().length < state.minWord || state.words.length >= state.max}>
          Add word
        </button>
      </form>
      <p className="text-xs text-muted">
        {state.words.length} of {state.max} words. You get a direct message when someone says one in a channel you can see (never for your own messages), at most once every{" "}
        {state.cooldownSeconds >= 60 ? `${Math.round(state.cooldownSeconds / 60)} minute${Math.round(state.cooldownSeconds / 60) === 1 ? "" : "s"}` : `${state.cooldownSeconds} seconds`} per word.
      </p>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      {state.words.length === 0 ? (
        <p className="text-sm text-muted">No words yet. Add a boss, an event or your own name.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {state.words.map((w) => (
            <li key={w.id} className="flex items-center gap-2 rounded-full border border-surface-border px-3 py-1 text-sm">
              <span>
                {w.word}
                {!w.wholeWord && <span className="ml-1 text-xs text-muted">(also inside words)</span>}
              </span>
              <button type="button" aria-label={`Remove ${w.word}`} className="text-muted hover:text-red-400" disabled={pending} onClick={() => run(() => actions.remove(w.id))}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Channels to skip</h3>
        {state.ignored.length === 0 ? (
          <p className="text-xs text-muted">None. Your words are watched in every channel you can see.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {state.ignored.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-full border border-surface-border px-3 py-1 text-xs">
                #{c.name}
                <button type="button" aria-label={`Stop skipping ${c.name}`} className="text-muted hover:text-red-400" disabled={pending} onClick={() => run(() => actions.ignore(c.id, false))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {state.ignored.length < state.maxIgnored && state.channels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${field} max-w-xs`} aria-label="Channel to skip" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="">Choose a channel…</option>
              {state.channels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
            <button type="button" className="rounded-md border border-surface-border px-3 py-2 text-sm text-muted transition hover:text-foreground disabled:opacity-40" disabled={pending || !channel} onClick={() => run(() => actions.ignore(channel, true), () => setChannel(""))}>
              Skip it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
