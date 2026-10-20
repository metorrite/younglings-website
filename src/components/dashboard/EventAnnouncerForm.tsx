"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, StatusBadge } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { choicesOf, type EventAnnouncer, type EventAnnouncerInput, type GuildStructure, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

const shape = (d: EventAnnouncerInput) => JSON.stringify([d.enabled, d.channelId, d.useRole, d.notifyStart]);
const input = (e: EventAnnouncer): EventAnnouncerInput => ({ enabled: e.enabled, channelId: e.channelId, useRole: e.useRole, notifyStart: e.notifyStart });

const STATE: Record<string, string> = { SCHEDULED: "Coming up", ACTIVE: "On now", COMPLETED: "Finished", CANCELED: "Cancelled" };

/**
 * Announces the server's Discord scheduled events in a channel (made when it is created, kept up to date as it changes, a message when it starts, shown as
 * finished or cancelled when it ends), with an optional temporary "interested" role that people get with a button and that is deleted afterwards. It is off
 * until switched on. Everything here is something most servers need, so there is no Advanced part.
 */
export function EventAnnouncerForm({
  initial,
  structure,
  save,
}: {
  initial: EventAnnouncer;
  structure: GuildStructure;
  save: (draft: EventAnnouncerInput) => Promise<WelcomeActionResult<EventAnnouncer>>;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<EventAnnouncerInput>(input(initial));
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(input(saved));
  const change = (patch: Partial<EventAnnouncerInput>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save(draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setDraft(input(result.data));
      setOutcome({ tone: "success", title: draft.enabled ? "Saved. New events are announced from now on." : "Saved. Events are not announced." });
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="announcer-main"
          title="Announcements"
          hint="Switch it on and choose the channel."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.enabled ? "good" : "bad"}>{draft.enabled ? "On" : "Off"}</Chip>
              <Chip tone={draft.channelId ? "plain" : "warn"}>{draft.channelId ? `#${structure.channels.find((c) => c.id === draft.channelId)?.name ?? "channel"}` : "No channel"}</Chip>
            </>
          }
          info="Only events created after you switch this on are announced. When an event is edited, its announcement is edited too (never posted again), and when it ends or is cancelled the announcement says so. JonnyBot needs View Channel, Send Messages and Embed Links in the channel."
        >
          <SettingRow
            title="Announce scheduled events"
            hint={draft.enabled ? "A new event is posted in the channel." : "Nothing is announced."}
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            offHint="Off: nothing is announced. Your choices are kept."
          />
          <FormField label="Channel" size="md" as="group">
            <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={draft.channelId} onChange={(id) => change({ channelId: id })} none="Choose a channel…" />
          </FormField>
          {saved.problem && <p className="text-sm text-amber-300">{saved.problem}</p>}
        </CollapsibleCard>

        <CollapsibleCard
          id="announcer-extras"
          title="Reminders and the interested role"
          hint="Tell people when it starts."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.useRole ? "good" : "plain"}>{draft.useRole ? "Interested role on" : "No role"}</Chip>
              <Chip>{draft.notifyStart ? "Start reminder" : "No reminder"}</Chip>
            </>
          }
          info={`A role is made for each event and handed out with an "I'm interested" button (pressing it again takes it back). It is mentioned when the event starts, then deleted when the event ends or is cancelled. Discord allows 250 roles in a server: JonnyBot stops making event roles when a server has ${saved.roleLimit - saved.roleHeadroom} (yours has ${saved.roleCount}), and announces without the button. It needs the Manage Roles permission.`}
        >
          <Toggle checked={draft.useRole} onChange={(on) => change({ useRole: on })} label="Give each event an “interested” role" detail="With a button on the announcement. Deleted when the event is over." />
          {draft.useRole && !saved.canManageRoles && (
            <p className="text-sm text-amber-300">JonnyBot doesn&apos;t have the Manage Roles permission, so it can&apos;t make the role. Give it that permission in Discord&apos;s server settings.</p>
          )}
          {draft.useRole && !saved.roomForRoles && (
            <p className="text-sm text-amber-300">
              This server has {saved.roleCount} of {saved.roleLimit} roles, so no more event roles are made until some are deleted.
            </p>
          )}
          <Toggle checked={draft.notifyStart} onChange={(on) => change({ notifyStart: on })} label="Post a reminder when it starts" detail="Mentions the interested role when there is one." />
        </CollapsibleCard>
      </PanelGrid>

      {saved.events.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Recently announced</h2>
          <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface text-sm">
            {saved.events.map((e) => (
              <li key={e.eventId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <span>{e.name ?? "An event that has been deleted"}</span>
                <span className="flex gap-2">
                  <StatusBadge tone={e.state === "ACTIVE" ? "good" : "muted"}>{STATE[e.state] ?? e.state}</StatusBadge>
                  {e.hasRole && <StatusBadge tone="muted">Has a role</StatusBadge>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SaveBar
        pending={pending}
        onSave={submit}
        outcome={outcome}
        dirty={dirty}
        onDiscard={() => {
          setDraft(input(saved));
          setOutcome(null);
        }}
      />
    </div>
  );
}
