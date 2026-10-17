"use client";

import { useEffect, useRef, useState } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { formatUtc, ghostButton, inputClass, Notice, primaryButton, StatusBadge } from "@/components/admin/ui";
import type { EventCall } from "@/components/dashboard/EventListView";
import { accessLine, draftOf, effectiveUse, groupChannels, patternOf, sameDraft, stateLine, withPattern, withUse } from "@/lib/eventSpace";
import type { EventDetail, SpaceAction, SpaceDraft, SpaceSlot, SpaceView } from "@/lib/eventTypes";
import { choicesOf, type GuildStructure } from "@/lib/jonnybot-admin";

type Problem = { title: string; items: string[] } | null;

const ACTION_LABEL: Record<SpaceAction, { tone: "good" | "muted" | "warn"; text: string }> = {
  create: { tone: "good", text: "New" },
  keep: { tone: "muted", text: "Already made" },
  use_existing: { tone: "muted", text: "Existing" },
  remove: { tone: "warn", text: "Not needed" },
};

const USE_LABEL: Record<SpaceSlot["use"], string> = { create: "JonnyBot makes it", existing: "Use an existing channel", none: "Leave it out" };

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
  const typing = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  /** Shows what the choices would make, a moment after the last change. */
  function change(next: SpaceDraft) {
    setDraft(next);
    setNote(null);
    if (typing.current) clearTimeout(typing.current);
    const ticket = ++asked.current;
    typing.current = setTimeout(async () => {
      const result = await call("POST", `${base}/preview`, next);
      if (ticket !== asked.current) return;
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setProblem(null);
      setView(result.data as SpaceView);
    }, 450);
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

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-semibold">Roles and channels</h3>
        <p className="text-sm text-muted">
          Once signups are closed, the roster is confirmed{teamEvent ? " and the teams are final" : ""}, JonnyBot can make a role for the players and one for the organisers
          {teamEvent ? ", a role for each team," : ""} and a category with the channels the event needs. Players only see their own part; organisers and staff see everything.
        </p>
      </div>

      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      <label className="flex items-start gap-3 rounded-xl border border-surface-border p-4 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={draft.enabled}
          disabled={busy || finished}
          onChange={(ev) => change({ ...draft, enabled: ev.target.checked })}
        />
        <span>
          <span className="font-medium">Make roles and channels for this event</span>
          <span className="mt-0.5 block text-xs text-muted">
            Off by default. Switching it on adds a step to the checklist, so the event can&apos;t start until they are set up (when it follows the setup steps).
          </span>
        </span>
        <span className="ml-auto shrink-0">
          <StatusBadge tone={state.tone}>{state.text}</StatusBadge>
        </span>
      </label>

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
          <StatusPanel view={view} />

          <div className="space-y-3 rounded-xl border border-surface-border p-4">
            <p className="text-sm font-medium">Channels</p>
            <p className="text-xs text-muted">
              For each one, JonnyBot makes it, you pick one that already exists (JonnyBot then uses it but never changes who can see it), or you leave it out. The bar under each
              name shows what it will be called.
            </p>
            <ul className="space-y-4">
              {view.settings.slots
                .filter((slot) => slot.applies)
                .map((slot) => {
                  const use = effectiveUse(slot, draft);
                  const planned = view.channels.find((c) => c.key === slot.key);
                  return (
                    <li key={slot.key} className="space-y-2 border-t border-surface-border pt-3 first:border-t-0 first:pt-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">{slot.label}</p>
                        <select
                          aria-label={`${slot.label}: how it is provided`}
                          className={`${inputClass} w-auto`}
                          value={use.use}
                          disabled={busy}
                          onChange={(ev) => change(withUse(draft, slot.key, ev.target.value as SpaceSlot["use"], use.channelId))}
                        >
                          {(Object.keys(USE_LABEL) as SpaceSlot["use"][]).map((u) => (
                            <option key={u} value={u}>
                              {USE_LABEL[u]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-muted">{slot.hint}</p>
                      {use.use === "existing" && structure && (
                        <ChannelSelect
                          {...choicesOf(structure)}
                          onlyPostable
                          allowForums={false}
                          value={use.channelId}
                          onChange={(id) => change(withUse(draft, slot.key, "existing", id))}
                          none="Choose a channel"
                        />
                      )}
                      {use.use === "create" && (
                        <label className="block space-y-1">
                          <span className="text-xs text-muted">Name (use {"{event}"} for the event&apos;s name)</span>
                          <input
                            className={inputClass}
                            value={patternOf(slot.key, slot.defaultPattern, draft)}
                            maxLength={100}
                            disabled={busy}
                            onChange={(ev) => change(withPattern(draft, slot.key, ev.target.value, slot.defaultPattern))}
                          />
                          {planned && planned.action !== "use_existing" && <span className="block text-xs text-gold">#{planned.name}</span>}
                        </label>
                      )}
                    </li>
                  );
                })}
            </ul>

            {teamEvent ? (
              <label className="flex items-start gap-3 border-t border-surface-border pt-3 text-sm">
                <input type="checkbox" className="mt-0.5" checked={draft.teamChannels} disabled={busy} onChange={(ev) => change({ ...draft, teamChannels: ev.target.checked })} />
                <span>
                  <span className="font-medium">A private channel and role for each team</span>
                  <span className="block text-xs text-muted">Each team gets a role, and only that team (and organisers and staff) can see its channel.</span>
                </span>
              </label>
            ) : (
              <label className="flex items-start gap-3 border-t border-surface-border pt-3 text-sm">
                <input type="checkbox" className="mt-0.5" checked={draft.playerChannels} disabled={busy} onChange={(ev) => change({ ...draft, playerChannels: ev.target.checked })} />
                <span>
                  <span className="font-medium">A private channel for each player</span>
                  <span className="block text-xs text-muted">Only that player (and organisers and staff) can see theirs. A big event needs a lot of channels, and Discord allows 50 in a category.</span>
                </span>
              </label>
            )}
          </div>

          <details className="rounded-xl border border-surface-border p-4">
            <summary className="cursor-pointer text-sm font-medium">What the category, roles and private channels are called</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {view.settings.names
                .filter((n) => nameKeys.includes(n.key))
                .map((n) => (
                  <label key={n.key} className="block space-y-1">
                    <span className="text-xs text-muted">
                      {n.label} ({n.variables.map((v) => `{${v}}`).join(", ")})
                    </span>
                    <input
                      className={inputClass}
                      value={patternOf(n.key, n.defaultPattern, draft)}
                      maxLength={100}
                      disabled={busy}
                      onChange={(ev) => change(withPattern(draft, n.key, ev.target.value, n.defaultPattern))}
                    />
                  </label>
                ))}
            </div>
            <p className="mt-2 text-xs text-muted">A channel&apos;s name is tidied to the way Discord writes them (lowercase, words joined with dashes).</p>
          </details>

          <Plan view={view} />
        </>
      )}
    </section>
  );
}

/** Where things stand and what is stopping the setup. */
function StatusPanel({ view }: { view: SpaceView }) {
  const applied = view.state.applied;
  return (
    <div className="space-y-2 rounded-xl border border-surface-border p-4 text-sm">
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
      {view.blockers.length === 0 && !applied && <p className="text-muted">Nothing stops it. The list below is what would be made.</p>}
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
    <div className="space-y-4 rounded-xl border border-surface-border p-4">
      <p className="text-sm font-medium">
        What this makes
        <span className="ml-2 text-xs font-normal text-muted">
          {view.summary.newRoles} new {view.summary.newRoles === 1 ? "role" : "roles"}, {view.summary.newChannels} new {view.summary.newChannels === 1 ? "channel or category" : "channels and categories"}
          {view.summary.toRemove > 0 ? `, ${view.summary.toRemove} no longer needed` : ""}
        </span>
      </p>

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
          <p className="text-xs text-muted">Staff who see everything: {view.staffRoles.map((s) => `@${s.name}`).join(", ")} (the Admin group in the server settings).</p>
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
