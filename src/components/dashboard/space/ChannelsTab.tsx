"use client";

import { useEffect, useRef, useState } from "react";
import { dangerButton, formatUtc, FormField, ghostButton, inputClass, Notice, primaryButton, StatusBadge } from "@/components/admin/ui";
import type { EventCall } from "@/components/dashboard/EventListView";
import { ChannelSlotRow } from "@/components/dashboard/space/ChannelSlotRow";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { accessLine, draftOf, effectiveUse, groupChannels, patternOf, sameDraft, stateLine, withPattern } from "@/lib/eventSpace";
import type { EventDetail, SpaceAction, SpaceDraft, SpaceView } from "@/lib/eventTypes";
import type { GuildStructure } from "@/lib/jonnybot-admin";

type Problem = { title: string; items: string[] } | null;

const ACTION_LABEL: Record<SpaceAction, { tone: "good" | "muted" | "warn"; text: string }> = {
  create: { tone: "good", text: "New" },
  keep: { tone: "muted", text: "Already made" },
  use_existing: { tone: "muted", text: "Existing" },
  remove: { tone: "warn", text: "Not needed" },
};

/**
 * Chooses and previews the roles and channels of an event: whether JonnyBot makes them, which channels it makes (or uses an existing one for), what everything
 * is called, and what exactly would be made, with who can see what. The preview is worked out by the bot from the choices as they are typed, nothing is
 * made on Discord from here until an organiser says so, and the bot decides every rule.
 */
export function ChannelsTab({ detail, call, structure, onDetail }: { detail: EventDetail; call: EventCall; structure?: GuildStructure; onDetail: (next: EventDetail) => void }) {
  const base = `events/${detail.event.id}/space`;
  const [view, setView] = useState<SpaceView | null>(null);
  const [draft, setDraft] = useState<SpaceDraft | null>(null);
  const [saved, setSaved] = useState<SpaceDraft | null>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removeUnneeded, setRemoveUnneeded] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [mode] = useViewMode();
  const typing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasRunning = useRef(false);
  // answers that arrive out of order must not replace a newer one
  const asked = useRef(0);

  useEffect(() => {
    let cancelled = false;
    call("GET", base).then((result) => {
      if (cancelled) return;
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      const next = result.data as SpaceView;
      setView(next);
      setDraft(draftOf(next.settings));
      setSaved(draftOf(next.settings));
    });
    return () => {
      cancelled = true;
      if (typing.current) clearTimeout(typing.current);
    };
  }, [base, call]);

  const running = view?.job?.state === "running";

  // while the bot is working, ask how far it got; when it stops, the checklist on the Overview tab needs the news
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(async () => {
      const result = await call("GET", base);
      if (result.ok) setView(result.data as SpaceView);
    }, 2000);
    return () => clearInterval(timer);
  }, [running, base, call]);

  useEffect(() => {
    if (running) {
      wasRunning.current = true;
      return;
    }
    if (!wasRunning.current) return;
    wasRunning.current = false;
    call("GET", `events/${detail.event.id}`).then((refreshed) => {
      if (refreshed.ok) onDetail(refreshed.data as EventDetail);
    });
  }, [running, call, detail.event.id, onDetail]);

  /** Shows what the choices would make, a moment after the last change. */
  function change(next: SpaceDraft) {
    setDraft(next);
    setNote(null);
    if (typing.current) clearTimeout(typing.current);
    const ticket = ++asked.current;
    const preview = async (attempt: number) => {
      const result = await call("POST", `${base}/preview`, next);
      if (ticket !== asked.current) return;
      if (!result.ok) {
        // a burst of edits can use up the allowance for changes: wait a moment and ask once more, rather than shouting about it
        if (attempt < 2 && /too fast/i.test(result.error)) {
          typing.current = setTimeout(() => preview(attempt + 1), 1500);
          return;
        }
        return setProblem({ title: result.error, items: result.problems });
      }
      setProblem(null);
      setView(result.data as SpaceView);
    };
    typing.current = setTimeout(() => preview(1), 600);
  }

  async function save() {
    if (!draft) return;
    if (typing.current) clearTimeout(typing.current);
    asked.current++;
    setBusy(true);
    setProblem(null);
    try {
      const result = await call("PUT", `${base}/settings`, draft);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      const next = result.data as SpaceView;
      setView(next);
      setDraft(draftOf(next.settings));
      setSaved(draftOf(next.settings));
      setNote("Saved.");
      const refreshed = await call("GET", `events/${detail.event.id}`);
      if (refreshed.ok) onDetail(refreshed.data as EventDetail);
    } finally {
      setBusy(false);
    }
  }

  /** Asks the bot to do something to the roles and channels on Discord; it answers at once and works in the background. */
  async function act(path: "apply" | "remove" | "sync", body: unknown, done?: string) {
    setBusy(true);
    setProblem(null);
    setNote(null);
    try {
      const result = await call("POST", `${base}/${path}`, body);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      const next = result.data as SpaceView & { syncFailed?: number };
      setView(next);
      setConfirmingRemoval(false);
      if (path === "sync") setNote(next.syncFailed ? `${next.syncFailed} roles couldn't be given or taken. Try again in a moment.` : "Everyone holds the roles they should.");
      else if (done) setNote(done);
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    if (!saved) return;
    if (typing.current) clearTimeout(typing.current);
    asked.current++;
    setProblem(null);
    change(saved);
  }

  if (!view || !draft || !saved) {
    return <section>{problem ? <Notice tone="error" title={problem.title} items={problem.items} /> : <p className="text-sm text-muted">Loading the roles and channels…</p>}</section>;
  }

  const dirty = !sameDraft(draft, saved);
  const finished = detail.event.status === "DONE" || detail.event.status === "CANCELLED";
  const state = stateLine(view);
  const teamEvent = view.teamEvent;
  const nameKeys = teamEvent ? ["category", "teamChannel", "participantRole", "organiserRole", "teamRole"] : ["category", "playerChannel", "participantRole", "organiserRole"];
  const slots = view.settings.slots.filter((slot) => slot.applies);
  const made = slots.filter((slot) => effectiveUse(slot, draft).use === "create").length;
  const chosen = slots.filter((slot) => effectiveUse(slot, draft).use === "existing").length;
  const left = slots.length - made - chosen;

  return (
    <section className="space-y-5">
      <div className="max-w-2xl space-y-1">
        <h2 className="text-lg font-semibold">Roles and channels</h2>
        <p className="text-sm text-muted">
          Once signups are closed, the roster is confirmed{teamEvent ? " and the teams are final" : ""}, JonnyBot can make a role for the players and one for the organisers
          {teamEvent ? ", a role for each team," : ""} and a category with the channels the event needs. Players only see their own part; organisers and staff see everything.
        </p>
      </div>

      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      <SettingRow
        title="Make roles and channels for this event"
        hint="Off by default. Switching it on adds a step to the checklist, so the event can't start until they are set up (when it follows the setup steps)."
        checked={draft.enabled}
        disabled={busy || finished}
        onChange={(enabled) => change({ ...draft, enabled })}
        badge={<StatusBadge tone={state.tone}>{state.text}</StatusBadge>}
        offHint="Off: nothing is made on Discord for this event, and no channel settings are shown."
      />

      {dirty && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-gold/50 bg-surface p-3 text-sm">
          <span className="mr-auto">You have changes that aren&apos;t saved yet.</span>
          <button type="button" className={ghostButton} disabled={busy} onClick={discard}>
            Discard
          </button>
          <button type="button" className={primaryButton} disabled={busy} onClick={save}>
            Save choices
          </button>
        </div>
      )}

      {draft.enabled && (
        <>
          <StatusPanel
            view={view}
            dirty={dirty}
            busy={busy}
            removeUnneeded={removeUnneeded}
            onRemoveUnneeded={setRemoveUnneeded}
            confirmingRemoval={confirmingRemoval}
            onConfirmRemoval={setConfirmingRemoval}
            onSetUp={() => act("apply", { removeUnneeded }, "Setting up. This takes a little while; you can leave this page.")}
            onRemove={() => act("remove", { confirm: true }, "Removing.")}
            onSync={() => act("sync", {})}
          />

          <PanelGrid min="32rem">
          <CollapsibleCard
            id="event-channels-list"
            title="Channels"
            hint="Which channels the event has, and whether JonnyBot makes each one or you pick one you already have."
            defaultOpen
            summary={
              <>
                <Chip tone="good">{made} made by JonnyBot</Chip>
                {chosen > 0 && <Chip>{chosen} existing</Chip>}
                {left > 0 && <Chip>{left} left out</Chip>}
              </>
            }
          >
            <PanelGrid min="20rem">
              {slots.map((slot) => {
                const planned = view.channels.find((c) => c.key === slot.key);
                return (
                  <ChannelSlotRow
                    key={slot.key}
                    slot={slot}
                    draft={draft}
                    onChange={change}
                    structure={structure}
                    disabled={busy}
                    plannedName={planned && planned.action !== "use_existing" ? planned.name : null}
                    mode={mode}
                  />
                );
              })}
              {teamEvent ? (
                <SettingRow
                  title="A private channel and role for each team"
                  hint="Each team gets a role, and only that team (and organisers and staff) can see its channel."
                  checked={draft.teamChannels}
                  disabled={busy}
                  onChange={(on) => change({ ...draft, teamChannels: on })}
                />
              ) : (
                <SettingRow
                  title="A private channel for each player"
                  hint="Only that player (and organisers and staff) can see theirs. A big event needs a lot of channels, and Discord allows 50 in a category."
                  checked={draft.playerChannels}
                  disabled={busy}
                  onChange={(on) => change({ ...draft, playerChannels: on })}
                />
              )}
            </PanelGrid>
          </CollapsibleCard>


          <CollapsibleCard
            id="event-channels-plan"
            title="What this makes"
            hint="The roles and channels JonnyBot would make, and who can see each."
            defaultOpen
            summary={
              <>
                <Chip tone="good">
                  {view.summary.newRoles} new {view.summary.newRoles === 1 ? "role" : "roles"}
                </Chip>
                <Chip tone="good">
                  {view.summary.newChannels} new {view.summary.newChannels === 1 ? "channel" : "channels"}
                </Chip>
                {view.summary.toRemove > 0 && <Chip tone="warn">{view.summary.toRemove} no longer needed</Chip>}
              </>
            }
          >
            <Plan view={view} />
          </CollapsibleCard>
          {mode === "advanced" && (
            <CollapsibleCard id="event-channels-names" title="Names" hint="What the category, roles and private channels are called.">
              <FieldGrid>
                {view.settings.names
                  .filter((n) => nameKeys.includes(n.key))
                  .map((n) => (
                    <FormField key={n.key} label={n.label} size="md" hint={`Can use ${n.variables.map((v) => `{${v}}`).join(", ")}`}>
                      <input
                        className={inputClass}
                        value={patternOf(n.key, n.defaultPattern, draft)}
                        maxLength={100}
                        disabled={busy}
                        onChange={(ev) => change(withPattern(draft, n.key, ev.target.value, n.defaultPattern))}
                      />
                    </FormField>
                  ))}
              </FieldGrid>
              <p className="text-xs text-muted">A channel&apos;s name is tidied to the way Discord writes them (lowercase, words joined with dashes).</p>
            </CollapsibleCard>
          )}
          </PanelGrid>
          <MoreInAdvanced>renaming the category, the roles and the private channels.</MoreInAdvanced>
        </>
      )}
    </section>
  );
}

/** Where things stand, what is stopping the setup, how far a running job got, and the buttons that act on Discord. */
function StatusPanel({
  view,
  dirty,
  busy,
  removeUnneeded,
  onRemoveUnneeded,
  confirmingRemoval,
  onConfirmRemoval,
  onSetUp,
  onRemove,
  onSync,
}: {
  view: SpaceView;
  dirty: boolean;
  busy: boolean;
  removeUnneeded: boolean;
  onRemoveUnneeded: (value: boolean) => void;
  confirmingRemoval: boolean;
  onConfirmRemoval: (value: boolean) => void;
  onSetUp: () => void;
  onRemove: () => void;
  onSync: () => void;
}) {
  const applied = view.state.applied;
  const job = view.job;
  const running = job?.state === "running";
  const stale = applied && !view.complete;
  const madeSomething = applied || view.channels.some((c) => c.action === "keep") || view.roles.some((r) => r.action === "keep");
  const locked = busy || running || dirty;
  return (
    <div className="space-y-3 rounded-xl border border-surface-border p-4 text-sm">
      {running && job && (
        <div className="space-y-1.5" role="status">
          <p className="font-medium">{job.kind === "removal" ? "Removing the roles and channels…" : "Setting up the roles and channels…"}</p>
          <div className="h-2 overflow-hidden rounded-full bg-surface-border" aria-hidden>
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.min(100, Math.round((job.done / Math.max(1, job.total)) * 100))}%` }} />
          </div>
          <p className="text-xs text-muted">
            {job.done} of {job.total}: {job.message}
          </p>
        </div>
      )}
      {!running && job && job.state === "failed" && <Notice tone="error" title="The last attempt stopped" items={[job.message, "Nothing is lost: press the button again to carry on where it stopped."]} />}
      {!running && job && job.state === "done" && <p className="text-xs text-muted">{job.message}</p>}

      {applied && (
        <p>
          Set up{view.state.appliedAt ? ` ${formatUtc(view.state.appliedAt)}` : ""}
          {view.state.appliedBy ? ` by ${view.state.appliedBy}` : ""}.{" "}
          {view.state.complete ? "Everything is there." : view.state.note ? `Something is missing: ${view.state.note}` : "Something is missing."}
        </p>
      )}
      {view.blockers.length > 0 && (
        <div className="space-y-1">
          <p className="font-medium">Can&apos;t be set up yet</p>
          <ul className="list-disc space-y-0.5 pl-5 text-muted">
            {view.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {view.warnings.map((w) => (
        <p key={w} className="text-xs text-gold">
          {w}
        </p>
      ))}

      <div className="flex flex-wrap items-center gap-2" hidden={running}>
        {(!applied || stale) && (
          <button type="button" className={primaryButton} disabled={locked || !view.ready} onClick={onSetUp}>
            {stale ? "Bring them up to date" : "Set up the roles and channels"}
          </button>
        )}
        {madeSomething && (
          <button type="button" className={ghostButton} disabled={locked} onClick={onSync}>
            Check who holds the roles
          </button>
        )}
        {madeSomething && !confirmingRemoval && (
          <button type="button" className={ghostButton} disabled={locked} onClick={() => onConfirmRemoval(true)}>
            Remove them…
          </button>
        )}
        {dirty && <span className="text-xs text-muted">Save your changes first.</span>}
      </div>

      {stale && view.summary.toRemove > 0 && (
        <label className="flex items-start gap-2 text-xs text-muted">
          <input type="checkbox" className="mt-0.5" checked={removeUnneeded} disabled={locked} onChange={(ev) => onRemoveUnneeded(ev.target.checked)} />
          <span>Also remove the {view.summary.toRemove} that this event no longer needs (a deleted team&apos;s channel). Anything said in them is deleted.</span>
        </label>
      )}

      {confirmingRemoval && (
        <div className="space-y-2 rounded-lg border border-red-400/40 p-3">
          <p>This deletes the roles and channels JonnyBot made for this event from Discord, including everything said in those channels. Channels you chose yourself are left alone.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={dangerButton} disabled={locked} onClick={onRemove}>
              Yes, remove them
            </button>
            <button type="button" className={ghostButton} disabled={busy} onClick={() => onConfirmRemoval(false)}>
              Keep them
            </button>
          </div>
        </div>
      )}

      {view.blockers.length === 0 && !applied && !running && <p className="text-muted">Nothing stops it. The list below is what would be made.</p>}
    </div>
  );
}

/** Longer lists than this show their first few and a button for the rest. */
const SHORT_LIST = 12;
const SHOWN_WHEN_SHORTENED = 8;

/** The roles and the channels that would be made, with who can see what. */
function Plan({ view }: { view: SpaceView }) {
  const groups = groupChannels(view.channels);
  const [open, setOpen] = useState<string[]>([]);
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Roles</p>
        <ul className="space-y-1 text-sm">
          {view.roles.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center gap-2">
              <span className="break-words">@{r.name}</span>
              <StatusBadge tone={ACTION_LABEL[r.action].tone}>{ACTION_LABEL[r.action].text}</StatusBadge>
              {r.action !== "remove" && (
                <span className="text-xs text-muted">{r.members === 0 ? "nobody yet" : `${r.members} ${r.members === 1 ? "person" : "people"}`}</span>
              )}
            </li>
          ))}
        </ul>
        {view.staffRoles.length > 0 && (
          <p className="text-xs text-muted">
            Staff who see everything: {view.staffRoles.map((s) => `@${s.name}`).join(", ")} (the Admin group in the server settings), and anyone with the Administrator permission.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Channels</p>
        {groups.length === 0 && <p className="text-sm text-muted">No channels would be made.</p>}
        {groups.map((g) => (
          <div key={g.key} className="space-y-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {g.category ? <span className="uppercase tracking-wide">{g.title}</span> : g.title}
              {g.category && <StatusBadge tone={ACTION_LABEL[g.category.action].tone}>{ACTION_LABEL[g.category.action].text}</StatusBadge>}
            </p>
            <ul className="space-y-1.5 pl-3 text-sm">
              {(g.channels.length > SHORT_LIST && !open.includes(g.key) ? g.channels.slice(0, SHOWN_WHEN_SHORTENED) : g.channels).map((c) => (
                <li key={c.key}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all">#{c.name}</span>
                    <span className="text-xs text-muted">{c.kindLabel}</span>
                    <StatusBadge tone={ACTION_LABEL[c.action].tone}>{ACTION_LABEL[c.action].text}</StatusBadge>
                  </div>
                  <p className="text-xs text-muted">{c.action === "remove" ? c.note : accessLine(c.access)}</p>
                </li>
              ))}
              {g.channels.length === 0 && <li className="text-xs text-muted">Nothing goes in it yet.</li>}
              {g.channels.length > SHORT_LIST && (
                <li>
                  <button type="button" className="text-xs text-gold underline" onClick={() => setOpen((o) => (o.includes(g.key) ? o.filter((k) => k !== g.key) : [...o, g.key]))}>
                    {open.includes(g.key) ? "Show fewer" : `Show all ${g.channels.length} channels`}
                  </button>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
