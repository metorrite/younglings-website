"use client";

import { confirmDialog } from "@/components/ui/Dialogs";
import { useState, useTransition } from "react";
import { dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton, StatusBadge } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import type { TempVoiceHubInput, TempVoiceList, WelcomeActionResult } from "@/lib/jonnybot-admin";

export interface TempVoiceActions {
  save: (input: TempVoiceHubInput) => Promise<WelcomeActionResult<TempVoiceList>>;
  remove: (hubChannelId: string) => Promise<WelcomeActionResult<TempVoiceList>>;
}

type Problem = { title: string; items: string[] } | null;

interface Draft {
  hubChannelId: string;
  create: boolean;
  hubName: string;
  categoryId: string;
  namePattern: string;
  userLimit: string;
}

const blank = (pattern: string): Draft => ({ hubChannelId: "", create: false, hubName: "➕ Create voice channel", categoryId: "", namePattern: pattern, userLimit: "0" });

/**
 * Temporary voice channels: people join a "Create voice channel" channel (the hub), get a channel of their own that they can rename, limit, lock and share
 * with a panel of buttons, and it is deleted when it empties. Basic is which channel is the hub (or letting JonnyBot create one) and what new channels are
 * called; Advanced adds the category they are made in and a member limit (both stay visible in Basic once saved).
 */
export function TempVoiceManager({ initial, actions }: { initial: TempVoiceList; actions: TempVoiceActions }) {
  const [list, setList] = useState(initial);
  const [draft, setDraft] = useState<Draft>(blank(initial.defaultPattern));
  const [open, setOpen] = useState(initial.hubs.length === 0);
  const [editing, setEditing] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const savedHub = list.hubs.find((h) => h.hubChannelId === draft.hubChannelId);
  const showAdvanced = advanced || (!!savedHub && (savedHub.categoryId !== null || savedHub.userLimit > 0));
  const hiddenNames = !showAdvanced ? ["the category the channels are made in", "a member limit"] : [];

  function run(work: () => Promise<WelcomeActionResult<TempVoiceList>>, done: string, after?: () => void) {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await work();
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setList(result.data);
      setNote(done);
      after?.();
    });
  }

  function save() {
    run(
      () =>
        actions.save({
          hubChannelId: draft.create ? undefined : draft.hubChannelId,
          createHub: draft.create,
          hubName: draft.create ? draft.hubName : undefined,
          categoryId: draft.categoryId || null,
          namePattern: draft.namePattern,
          userLimit: Number(draft.userLimit) || 0,
        }),
      editing ? "Saved." : "Done. Anyone who joins that channel now gets a voice channel of their own.",
      () => {
        setDraft(blank(list.defaultPattern));
        setEditing(false);
        setOpen(false);
      },
    );
  }

  const canSave = !pending && draft.namePattern.trim() !== "" && (draft.create ? draft.hubName.trim() !== "" : draft.hubChannelId !== "");

  return (
    <div className="space-y-4">
      {list.problem && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">{list.problem}</p>
      )}

      <CollapsibleCard
        id="tempvoice-form"
        title={editing ? "Change a hub" : "Add a hub"}
        hint="The channel people join to get a voice channel of their own."
        open={open}
        onOpenChange={setOpen}
        summary={<Chip tone={list.hubs.length > 0 ? "good" : "plain"}>{list.hubs.length === 1 ? "1 hub" : `${list.hubs.length} hubs`}</Chip>}
        info={`Nothing happens until you add a hub. Joining it makes the member a channel (named from the pattern, in the category you choose or the hub's own) and moves them in; it is deleted when it is empty, even after a restart. Owners get a panel of buttons in the channel's text chat to rename it, set a limit, lock it, permit or remove people, hand it on, or claim it when the owner has left; they are never given Manage Channel. JonnyBot needs Manage Channels, Manage Permissions and Move Members. A server can have up to ${list.maxHubs} hubs and ${list.maxChannels} temporary channels at once. If another bot such as VoiceMaster already does this, switch its hub off before you use ours, or people get two channels.`}
      >
        <Toggle checked={draft.create} onChange={(on) => setDraft({ ...draft, create: on, hubChannelId: on ? "" : draft.hubChannelId })} label="JonnyBot creates the hub channel" detail="Off: choose a voice channel you already have." disabled={editing} />
        {draft.create ? (
          <FormField label="Name of the new channel" size="md">
            <input className={inputClass} value={draft.hubName} maxLength={list.maxName} onChange={(e) => setDraft({ ...draft, hubName: e.target.value })} />
          </FormField>
        ) : (
          <FormField label="Hub channel" size="md" hint="People join this channel to get their own.">
            <select className={inputClass} value={draft.hubChannelId} disabled={editing} onChange={(e) => setDraft({ ...draft, hubChannelId: e.target.value })}>
              <option value="">Choose a voice channel…</option>
              {list.voiceChannels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.category ? ` (${v.category})` : ""}
                </option>
              ))}
            </select>
          </FormField>
        )}
        <FormField label="Name of each new channel" size="md" hint="{user} is the person's name. For example {user}'s channel.">
          <input className={inputClass} value={draft.namePattern} maxLength={list.maxName} onChange={(e) => setDraft({ ...draft, namePattern: e.target.value })} />
        </FormField>
        {showAdvanced && (
          <>
            <FormField label="Make the channels in category" size="md" hint="Empty uses the hub's own category.">
              <select className={inputClass} value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
                <option value="">The hub&apos;s category</option>
                {list.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Member limit" size="sm" hint={`0 for no limit, up to ${list.maxUserLimit}. Owners can change it for their own channel.`}>
              <input className={inputClass} inputMode="numeric" value={draft.userLimit} onChange={(e) => setDraft({ ...draft, userLimit: e.target.value })} />
            </FormField>
          </>
        )}
        {hiddenNames.length > 0 && <MoreInAdvanced>the category the channels are made in and a member limit.</MoreInAdvanced>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryButton} disabled={!canSave} onClick={save}>
            {pending ? "Saving…" : editing ? "Save changes" : draft.create ? "Create the hub" : "Make it a hub"}
          </button>
          {editing && (
            <button
              type="button"
              className={ghostButton}
              onClick={() => {
                setDraft(blank(list.defaultPattern));
                setEditing(false);
                setOpen(false);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </CollapsibleCard>

      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Hubs</h2>
        {list.hubs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">
            No hub yet. Add one above, and anyone who joins it gets a voice channel of their own.
          </p>
        ) : (
          <PanelGrid min="22rem" gap="gap-3">
            {list.hubs.map((h) => (
              <div key={h.hubChannelId} className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5">
                <div>
                  <p className="font-semibold">🔊 {h.hubChannelName ?? "deleted channel"}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Makes “{h.namePattern}”{h.categoryName ? ` in ${h.categoryName}` : ""}
                    {h.userLimit > 0 ? `, limit ${h.userLimit}` : ""}
                  </p>
                </div>
                <StatusBadge tone={h.problem || list.problem ? "warn" : "good"}>{h.problem ? "Not working" : list.problem ? "Needs permissions" : "Active"}</StatusBadge>
                {h.problem && <p className="text-sm text-amber-300">{h.problem}</p>}
                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold"
                    onClick={() => {
                      setDraft({ hubChannelId: h.hubChannelId, create: false, hubName: "", categoryId: h.categoryId ?? "", namePattern: h.namePattern, userLimit: String(h.userLimit) });
                      setEditing(true);
                      setOpen(true);
                    }}
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    className={dangerButton}
                    disabled={pending}
                    onClick={async () => {
                      if (!(await confirmDialog({ title: "Stop using this hub?", body: "The channel stays, and temporary channels already made last until they are empty.", confirmLabel: "Stop", tone: "danger" }))) return;
                      run(() => actions.remove(h.hubChannelId), "That channel is no longer a hub.");
                    }}
                  >
                    Stop using
                  </button>
                </div>
              </div>
            ))}
          </PanelGrid>
        )}
      </section>

      {list.active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Channels in use now</h2>
          <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface text-sm">
            {list.active.map((a) => (
              <li key={a.channelId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <span>
                  🔊 {a.name ?? "deleted channel"} <span className="text-muted">owned by {a.ownerName ?? "someone who left"}</span>
                </span>
                <span className="flex gap-2">
                  <StatusBadge tone="muted">{a.members === 1 ? "1 person" : `${a.members} people`}</StatusBadge>
                  {a.locked && <StatusBadge tone="muted">Locked</StatusBadge>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
