"use client";

import { useEffect, useState } from "react";
import { ghostButton, Notice, primaryButton } from "@/components/admin/ui";
import type { EventCall } from "@/components/dashboard/EventListView";
import { ChannelSlotRow } from "@/components/dashboard/space/ChannelSlotRow";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { useViewMode, ViewModeSwitch } from "@/components/dashboard/ui/ViewMode";
import { draftOf, effectiveUse, sameDraft } from "@/lib/eventSpace";
import type { EventDetail, SpaceDraft, SpaceView } from "@/lib/eventTypes";
import type { GuildStructure } from "@/lib/jonnybot-admin";

/**
 * The live board channel and the proof-review channel of a bingo (or any event that takes proof), set the same way as everything on the Channels tab: each is
 * switched on or off, then JonnyBot makes it (with a name) or an existing channel is used. It reads and saves the same settings as that tab, so the two never
 * disagree; nothing is made on Discord until the roles and channels are set up.
 */
export function BoardChannelsPanel({ detail, call, structure, onOpenChannels }: { detail: EventDetail; call: EventCall; structure?: GuildStructure; onOpenChannels: () => void }) {
  const base = `events/${detail.event.id}/space`;
  const [view, setView] = useState<SpaceView | null>(null);
  const [draft, setDraft] = useState<SpaceDraft | null>(null);
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useViewMode("event-channels");

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
  const kept = slots.filter((s) => effectiveUse(s, draft).use !== "none").length;

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
    <CollapsibleCard
      id="event-board-channels"
      title="Discord channels"
      hint="Where the live board and the proof to review are posted."
      defaultOpen
      summary={
        <>
          <Chip tone={kept > 0 ? "good" : "plain"}>
            {kept} of {slots.length} in use
          </Chip>
          {!draft.enabled && <Chip tone="warn">JonnyBot can&apos;t make them</Chip>}
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ViewModeSwitch mode={mode} onChange={setMode} />
        <button type="button" className="text-xs text-gold underline" onClick={onOpenChannels}>
          Roles, category and every channel: open the Channels tab
        </button>
      </div>
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}
      <SettingRow
        title="Let JonnyBot make this event's roles and channels"
        hint="It makes them when you press Set up on the Channels tab, after signups close."
        checked={draft.enabled}
        onChange={(enabled) => setDraft({ ...draft, enabled })}
        disabled={busy || over}
        offHint="Off: every channel below is one you already have, or none."
      />
      <div className="space-y-3">
        {slots.map((slot) => (
          <ChannelSlotRow key={slot.key} slot={slot} draft={draft} onChange={setDraft} structure={structure} disabled={busy || over} canMake={draft.enabled} mode={mode} />
        ))}
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
    </CollapsibleCard>
  );
}
