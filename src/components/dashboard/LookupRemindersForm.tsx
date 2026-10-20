"use client";

import { useState, useTransition } from "react";
import { ChannelSelect, RoleSelect } from "@/components/admin/pickers";
import { FormField } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { choicesOf, type GuildStructure, type LookupReminder, type LookupSettings, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

const shape = (s: LookupSettings) => JSON.stringify(s.reminders.map((r) => [r.kind, r.enabled, r.channelId, r.roleId]));

/**
 * Optional timer reminders (all off by default): each is a switch that owns the channel it posts in and the role it pings. The commands these timers
 * belong to are switched on and off on the Commands page, not here.
 */
export function LookupRemindersForm({
  initial,
  structure,
  save,
}: {
  initial: LookupSettings;
  structure: GuildStructure;
  save: (draft: { reminders: Pick<LookupReminder, "kind" | "enabled" | "channelId" | "roleId">[] }) => Promise<WelcomeActionResult<LookupSettings>>;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(saved);

  const change = (kind: string, patch: Partial<LookupReminder>) => {
    setDraft((d) => ({ reminders: d.reminders.map((r) => (r.kind === kind ? { ...r, ...patch } : r)) }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save({ reminders: draft.reminders.map(({ kind, enabled, channelId, roleId }) => ({ kind, enabled, channelId, roleId })) });
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setDraft(result.data);
      setOutcome({ tone: "success", title: "Saved." });
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="22rem">
        {draft.reminders.map((r) => (
          <CollapsibleCard
            key={r.kind}
            id={`rs-timer-${r.kind}`}
            title={r.title}
            hint={r.description}
            defaultOpen
            summary={
              <>
                <Chip tone={r.enabled ? "good" : "bad"}>{r.enabled ? "On" : "Off"}</Chip>
                {r.enabled && <Chip tone={r.channelId ? "plain" : "warn"}>{r.channelId ? `#${structure.channels.find((c) => c.id === r.channelId)?.name ?? "channel"}` : "No channel"}</Chip>}
              </>
            }
            info="The reminder is posted by JonnyBot in the channel you choose. If you pick a role, it is pinged, so members opt in by taking that role (a role panel works well for this)."
          >
            <SettingRow
              title={`Post the ${r.title} reminder`}
              hint={r.enabled ? "Posted in the channel below." : "Nothing is posted."}
              checked={r.enabled}
              onChange={(on) => change(r.kind, { enabled: on })}
              offHint="Off: nothing is posted. Your channel and role are kept."
            >
              <FormField label="Channel" size="md" as="group">
                <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={r.channelId} onChange={(id) => change(r.kind, { channelId: id })} none="Choose a channel…" />
              </FormField>
              <FormField label="Role to ping (optional)" size="md" as="group" info="Leave empty to post without pinging anyone.">
                <RoleSelect roles={structure.roles} value={r.roleId} onChange={(id) => change(r.kind, { roleId: id })} none="Nobody" label={`${r.title} role`} />
              </FormField>
            </SettingRow>
          </CollapsibleCard>
        ))}
      </PanelGrid>

      <SaveBar
        pending={pending}
        onSave={submit}
        outcome={outcome}
        dirty={dirty}
        onDiscard={() => {
          setDraft(saved);
          setOutcome(null);
        }}
      />
    </div>
  );
}
