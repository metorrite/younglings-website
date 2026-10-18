"use client";

import { useEffect, useState } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import type { EventCall } from "@/components/dashboard/EventListView";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { draftOf, effectiveUse, patternOf, sameDraft, withPattern, withUse } from "@/lib/eventSpace";
import type { EventDetail, SpaceDraft, SpaceSlot, SpaceView } from "@/lib/eventTypes";
import { choicesOf, type GuildStructure } from "@/lib/jonnybot-admin";

const USE_LABEL: Record<SpaceSlot["use"], string> = { create: "JonnyBot makes it", existing: "Use a channel I already have", none: "Leave it out" };

/**
 * The live board channel and the proof-review channel of a bingo (or any event that takes proof), chosen the same way as everything on the Channels tab:
 * JonnyBot makes it with a name from a pattern, an existing channel is used, or it is left out. It reads and saves the same settings as that tab, so the
 * two never disagree; nothing is made on Discord until the roles and channels are set up.
 */
export function BoardChannelsPanel({ detail, call, structure, onOpenChannels }: { detail: EventDetail; call: EventCall; structure?: GuildStructure; onOpenChannels: () => void }) {
  const base = `events/${detail.event.id}/space`;
  const [view, setView] = useState<SpaceView | null>(null);
  const [draft, setDraft] = useState<SpaceDraft | null>(null);
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    call("GET", base).then((result) => {
      if (cancelled) return;
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      const next = result.data as SpaceView;
      setView(next);
      setDraft(draftOf(next.settings));
    });
    return () => {
      cancelled = true;
    };
  }, [base, call]);

  if (!view || !draft) return <div className="rounded-xl border border-surface-border p-4 text-sm text-muted">{problem ? <Notice tone="error" title={problem.title} items={problem.items} /> : "Loading the channels…"}</div>;

  const slots = view.settings.slots.filter((s) => s.applies && (s.key === "board" || s.key === "review"));
  const dirty = !sameDraft(draft, draftOf(view.settings));
  const over = detail.event.status === "DONE" || detail.event.status === "CANCELLED";

  async function save() {
    if (!draft) return;
    setBusy(true);
    setProblem(null);
    setNote(null);
    try {
      const result = await call("PUT", `${base}/settings`, draft);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      const next = result.data as SpaceView;
      setView(next);
      setDraft(draftOf(next.settings));
      setNote(next.state.applied ? "Saved. Changes reach Discord the next time you set up on the Channels tab." : "Saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-surface-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Discord channels</p>
        <button type="button" className="text-xs text-gold underline" onClick={onOpenChannels}>
          All channels, names and the setup: open the Channels tab
        </button>
      </div>
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}
      <Toggle
        checked={draft.enabled}
        onChange={(enabled) => setDraft({ ...draft, enabled })}
        disabled={busy || over}
        label="Let JonnyBot make this event's roles and channels"
        detail="It makes them when you press Set up on the Channels tab, after signups close. Off: every channel below is one you already have, or none."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {slots.map((slot) => {
          const use = effectiveUse(slot, draft);
          return (
            <div key={slot.key} className="space-y-2">
              <p className="text-xs font-medium">{slot.label}</p>
              <select
                className={inputClass}
                value={use.use}
                disabled={busy || over}
                onChange={(e) => setDraft(withUse(draft, slot.key, e.target.value as SpaceSlot["use"], use.channelId))}
              >
                {(Object.keys(USE_LABEL) as SpaceSlot["use"][])
                  .filter((u) => u !== "create" || draft.enabled)
                  .map((u) => (
                    <option key={u} value={u}>
                      {USE_LABEL[u]}
                    </option>
                  ))}
              </select>
              {use.use === "existing" && structure && (
                <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={use.channelId} onChange={(id) => setDraft(withUse(draft, slot.key, "existing", id))} none="Choose a channel" />
              )}
              {use.use === "create" && (
                <label className="block space-y-1">
                  <span className="text-xs text-muted">Name</span>
                  <input
                    className={inputClass}
                    value={patternOf(slot.key, slot.defaultPattern, draft)}
                    maxLength={100}
                    disabled={busy || over}
                    onChange={(e) => setDraft(withPattern(draft, slot.key, e.target.value, slot.defaultPattern))}
                  />
                  <span className="text-xs text-muted">{"{event}"} is the event&apos;s name. Usual: {slot.defaultPattern}</span>
                </label>
              )}
              <p className="text-xs text-muted">{slot.hint}</p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButton} disabled={busy || over || !dirty} onClick={save}>
          Save channels
        </button>
        {dirty && (
          <button type="button" className={ghostButton} disabled={busy} onClick={() => setDraft(draftOf(view.settings))}>
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
