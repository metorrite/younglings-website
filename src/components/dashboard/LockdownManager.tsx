"use client";

import { useState, useTransition } from "react";
import { confirmDialog } from "@/components/ui/Dialogs";
import { ChannelSelect } from "@/components/admin/pickers";
import { dangerButton, FormField, formatUtc, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { ChannelListPicker, RolePicker } from "@/components/dashboard/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { choicesOf, type GuildStructure, type Lockdown, type WelcomeActionResult } from "@/lib/jonnybot-admin";

export interface LockdownActions {
  save: (set: { channelIds: string[]; keepTalkingRoleIds: string[] }) => Promise<WelcomeActionResult<Lockdown>>;
  lock: (channelId: string, reason: string) => Promise<WelcomeActionResult<Lockdown>>;
  unlock: (channelId: string) => Promise<WelcomeActionResult<Lockdown>>;
  start: (reason: string) => Promise<WelcomeActionResult<Lockdown>>;
  end: () => Promise<WelcomeActionResult<Lockdown>>;
}

type Problem = { title: string; items: string[] } | null;
type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

/**
 * Locking channels: stop everyone but chosen roles from talking, in one channel or in a saved set at once, and put the permissions back exactly as they were.
 * The set and the roles that keep talking are saved on the first card; the second starts and ends a lockdown of the whole set; the third locks and unlocks
 * single channels and lists what is locked now. Everything here is the same as `/lock`, `/unlock` and `/lockdown` in Discord. Only an Admin can use it.
 */
export function LockdownManager({
  initial,
  structure,
  canEdit,
  actions,
}: {
  initial: Lockdown;
  structure: GuildStructure;
  canEdit: boolean;
  actions: LockdownActions;
}) {
  const [data, setData] = useState(initial);
  const [channelIds, setChannelIds] = useState(initial.channelIds);
  const [roleIds, setRoleIds] = useState(initial.keepTalkingRoleIds);
  const [reason, setReason] = useState("");
  const [oneChannel, setOneChannel] = useState<string | null>(null);
  const [oneReason, setOneReason] = useState("");
  const [saveOutcome, setSaveOutcome] = useState<Outcome>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const roles = structure.roles.filter((r) => r.id);
  const dirty = JSON.stringify([channelIds, roleIds]) !== JSON.stringify([data.channelIds, data.keepTalkingRoleIds]);
  const lockedByLockdown = data.locks.filter((l) => l.lockdown).length;
  const nameOf = (id: string) => structure.channels.find((c) => c.id === id)?.name;

  function run(work: () => Promise<WelcomeActionResult<Lockdown>>, done: string, after?: () => void) {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await work();
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setData(result.data);
      setNote(done);
      after?.();
    });
  }

  function saveSet() {
    setSaveOutcome(null);
    start(async () => {
      const result = await actions.save({ channelIds, keepTalkingRoleIds: roleIds });
      if (!result.ok) return setSaveOutcome({ tone: "error", title: result.error, items: result.problems });
      setData(result.data);
      setChannelIds(result.data.channelIds);
      setRoleIds(result.data.keepTalkingRoleIds);
      setSaveOutcome({ tone: "success", title: "Saved." });
    });
  }

  return (
    <div className="space-y-6">
      {!canEdit && <Notice tone="error" title="Only an Admin can lock channels or change the lockdown set. You can look, but not change anything." />}

      <PanelGrid min="22rem">
        <CollapsibleCard
          id="lockdown-set"
          title="The lockdown set"
          hint="Which channels a lockdown locks, and who can still talk in them."
          defaultOpen
          summary={
            <>
              <Chip tone={data.channelIds.length === 0 ? "warn" : "good"}>
                {data.channelIds.length} channel{data.channelIds.length === 1 ? "" : "s"}
              </Chip>
              <Chip>{data.keepTalkingRoleIds.length} role{data.keepTalkingRoleIds.length === 1 ? "" : "s"} keep talking</Chip>
            </>
          }
          info="A lock takes the speaking permissions (send messages, send in threads, make threads, add reactions) away from @everyone in that channel and nothing else. Roles listed to keep talking are explicitly allowed to send, so staff are never locked out. Before changing anything JonnyBot writes down the channel's exact permissions, and unlocking puts them back."
        >
          <FormField label="Channels in the lockdown set" as="group" size="lg" hint={`Up to ${data.maxChannels}. JonnyBot must be able to manage permissions in each.`}>
            <ChannelListPicker
              channels={structure.channels}
              allowForums={false}
              value={channelIds}
              max={data.maxChannels}
              disabled={!canEdit}
              empty="No channels yet."
              onChange={(ids) => { setChannelIds(ids); setSaveOutcome(null); }}
            />
          </FormField>
          <FormField label="Roles that keep talking while locked" as="group" size="lg" hint={`Up to ${data.maxRoles}. Usually your staff roles.`}>
            <RolePicker
              roles={roles}
              value={roleIds}
              max={data.maxRoles}
              disabled={!canEdit}
              onChange={(ids) => { setRoleIds(ids); setSaveOutcome(null); }}
            />
          </FormField>
          <SaveBar pending={pending} onSave={saveSet} outcome={saveOutcome} dirty={dirty && canEdit} onDiscard={() => { setChannelIds(data.channelIds); setRoleIds(data.keepTalkingRoleIds); setSaveOutcome(null); }} />
        </CollapsibleCard>

        <CollapsibleCard
          id="lockdown-run"
          title="Lockdown"
          hint="Lock the whole set at once, or put it all back."
          defaultOpen
          summary={<Chip tone={lockedByLockdown > 0 ? "bad" : "good"}>{lockedByLockdown > 0 ? `${lockedByLockdown} locked` : "Not active"}</Chip>}
          info="Starting a lockdown locks every channel in the saved set that isn't locked already. Ending it unlocks only the channels the lockdown locked, so a channel you locked by hand stays locked."
        >
          <FormField label="Why (shown in each channel, optional)" size="lg">
            <input className={inputClass} value={reason} maxLength={200} placeholder="Raid in progress" onChange={(e) => setReason(e.target.value)} />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={dangerButton}
              disabled={pending || !canEdit || data.channelIds.length === 0}
              onClick={async () =>
                (await confirmDialog({
                  title: "Start the lockdown?",
                  body: `${data.channelIds.length} channel${data.channelIds.length === 1 ? "" : "s"} will stop letting people talk until you end it.`,
                  confirmLabel: "Start lockdown",
                  tone: "danger",
                })) && run(() => actions.start(reason), "Lockdown started.")
              }
            >
              Start lockdown
            </button>
            <button type="button" className={ghostButton} disabled={pending || !canEdit || lockedByLockdown === 0} onClick={() => run(() => actions.end(), "Lockdown ended. Permissions are back as they were.")}>
              End lockdown
            </button>
          </div>
          {data.channelIds.length === 0 && <p className="text-xs text-muted">Save some channels in the set first.</p>}
        </CollapsibleCard>
      </PanelGrid>

      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      <CollapsibleCard
        id="lockdown-locked"
        title="Locked right now"
        hint="Lock one channel, or unlock a locked one."
        defaultOpen
        summary={<Chip tone={data.locks.length > 0 ? "warn" : "good"}>{data.locks.length} locked</Chip>}
      >
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Channel to lock" size="md" as="group">
            <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={oneChannel} onChange={setOneChannel} none="Choose a channel…" />
          </FormField>
          <FormField label="Why (optional)" size="md">
            <input className={inputClass} value={oneReason} maxLength={200} onChange={(e) => setOneReason(e.target.value)} />
          </FormField>
          <button
            type="button"
            className={primaryButton}
            disabled={pending || !canEdit || !oneChannel}
            onClick={() => run(() => actions.lock(oneChannel!, oneReason), "Locked.", () => { setOneChannel(null); setOneReason(""); })}
          >
            Lock
          </button>
        </div>
        {data.locks.length === 0 ? (
          <p className="text-sm text-muted">Nothing is locked.</p>
        ) : (
          <ul className="space-y-2">
            {data.locks.map((lock) => (
              <li key={lock.channelId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-border px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">#{lock.channelName ?? nameOf(lock.channelId) ?? "deleted channel"}</span>
                  <span className="text-muted">
                    {" "}
                    · by {lock.lockedBy} · {formatUtc(lock.lockedAt)}
                    {lock.lockdown ? " · lockdown" : ""}
                    {lock.reason ? ` · ${lock.reason}` : ""}
                  </span>
                </span>
                <button type="button" className={ghostButton} disabled={pending || !canEdit} onClick={() => run(() => actions.unlock(lock.channelId), "Unlocked. Permissions are back as they were.")}>
                  {lock.channelName === null ? "Forget" : "Unlock"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleCard>
    </div>
  );
}
