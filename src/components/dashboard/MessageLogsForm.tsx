"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, inputClass } from "@/components/admin/ui";
import { ChannelListPicker } from "@/components/dashboard/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { choicesOf, type GuildStructure, type MessageLogSettings, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Draft = Pick<MessageLogSettings, "enabled" | "retentionDays" | "excludedChannels" | "editChannelId" | "deleteChannelId" | "voiceChannelId">;

const shape = (s: Draft) => JSON.stringify([s.enabled, s.retentionDays, s.excludedChannels, s.editChannelId, s.deleteChannelId, s.voiceChannelId]);

/**
 * Message and voice logs. The switch owns the three log channels (each log is on when it has a channel). How long message text is kept, and what is never kept,
 * sit in their own panel: the length is Basic, the channels left out are Advanced (and stay visible once saved). Forgetting everything now is a button, not a setting.
 */
export function MessageLogsForm({
  initial,
  structure,
  save,
  clear,
}: {
  initial: MessageLogSettings;
  structure: GuildStructure;
  save: (draft: Draft) => Promise<WelcomeActionResult<MessageLogSettings>>;
  clear: () => Promise<WelcomeActionResult<MessageLogSettings>>;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const dirty = shape(draft) !== shape(saved);
  const showExcluded = advanced || saved.excludedChannels.length > 0;
  const name = (id: string | null) => structure.channels.find((c) => c.id === id)?.name;
  const logs = [draft.editChannelId && "edits", draft.deleteChannelId && "deletes", draft.voiceChannelId && "voice"].filter((x): x is string => typeof x === "string");

  const change = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save({
        enabled: draft.enabled,
        retentionDays: draft.retentionDays,
        excludedChannels: draft.excludedChannels,
        editChannelId: draft.editChannelId,
        deleteChannelId: draft.deleteChannelId,
        voiceChannelId: draft.voiceChannelId,
      });
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setDraft(result.data);
      setOutcome({ tone: "success", title: draft.enabled ? "Saved. The logs are on." : "Saved. The logs are off and remembered messages were removed." });
    });
  }

  function forget() {
    setOutcome(null);
    start(async () => {
      const result = await clear();
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved((s) => ({ ...s, remembered: result.data.remembered }));
      setDraft((d) => ({ ...d, remembered: result.data.remembered }));
      setOutcome({ tone: "success", title: "Every remembered message was removed." });
    });
  }

  const channelField = (label: string, key: "editChannelId" | "deleteChannelId" | "voiceChannelId", info: string) => (
    <FormField label={label} size="md" as="group" info={info}>
      <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={draft[key]} onChange={(id) => change({ [key]: id })} none="Not logged" />
    </FormField>
  );

  return (
    <div className="space-y-4">
      {!saved.messageContent && (
        <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          JonnyBot is running without the <strong>Message Content</strong> intent, so it can&apos;t keep message text: edits and deletes won&apos;t be logged (voice still works). Turn it on in the Discord Developer
          Portal (Bot, Privileged Gateway Intents) and restart the bot.
        </p>
      )}
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="msglogs-where"
          title="What is logged, and where"
          hint="Switch it on and choose a channel for each log."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.enabled ? "good" : "bad"}>{draft.enabled ? "On" : "Off"}</Chip>
              <Chip tone={logs.length > 0 ? "plain" : "warn"}>{logs.length > 0 ? logs.join(", ") : "No channel yet"}</Chip>
            </>
          }
          info="Each log is written to its own channel (use the same one for all if you like). Leave a log on 'Not logged' to skip it. Staff should be the only ones who can read these channels."
        >
          <SettingRow
            title="Run the logs"
            hint={draft.enabled ? "Logs are written to the channels below." : "Nothing is logged or remembered."}
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            offHint="Off: nothing is logged and every remembered message is removed. Your channels are kept."
          >
            {channelField("Edited messages", "editChannelId", "Shows what a message said before and after the edit.")}
            {channelField("Deleted messages", "deleteChannelId", "Shows who wrote the message, where, and what it said. Several messages deleted at once become one entry.")}
            {channelField("Voice", "voiceChannelId", "Who joined, left or moved between voice channels.")}
          </SettingRow>
        </CollapsibleCard>

        <CollapsibleCard
          id="msglogs-keep"
          title="Remembering messages"
          hint="How long message text is kept."
          defaultOpen
          summary={
            <>
              <Chip>{draft.retentionDays} day{draft.retentionDays === 1 ? "" : "s"}</Chip>
              <Chip>{saved.remembered} kept now</Chip>
            </>
          }
          info="To show what an edited or deleted message said, JonnyBot has to remember it for a while. Text is kept only for this many days, never from direct messages, bots or the channels you leave out, and is removed automatically (a clean-up runs every six hours)."
        >
          <FormField label="Days to remember" size="sm" info={`${saved.limits.minDays} to ${saved.limits.maxDays}.`}>
            <input
              type="number"
              className={inputClass}
              min={saved.limits.minDays}
              max={saved.limits.maxDays}
              value={draft.retentionDays}
              onChange={(e) => change({ retentionDays: Math.max(saved.limits.minDays, Math.min(saved.limits.maxDays, Math.trunc(Number(e.target.value) || saved.limits.minDays))) })}
            />
          </FormField>
          {showExcluded && (
            <FormField label="Channels never remembered" as="group" size="lg" info="Nothing said in these channels (or their threads) is kept, so their edits and deletes are never logged. Saving removes what is already kept from them.">
              <ChannelListPicker
                channels={structure.channels}
                allowForums={false}
                value={draft.excludedChannels}
                max={saved.limits.maxExcluded}
                empty="No channel is left out."
                onChange={(ids) => change({ excludedChannels: ids })}
              />
            </FormField>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending || saved.remembered === 0}
              onClick={forget}
              className="rounded-full border border-surface-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground disabled:opacity-40"
            >
              Forget everything now
            </button>
            <span className="text-xs text-muted">{saved.remembered === 0 ? "Nothing is being kept." : `${saved.remembered} message${saved.remembered === 1 ? "" : "s"} kept.`}</span>
          </div>
          {name(draft.editChannelId) === undefined && draft.editChannelId && <p className="text-xs text-red-300">The edits channel no longer exists.</p>}
        </CollapsibleCard>
      </PanelGrid>

      {!showExcluded && <MoreInAdvanced>channels that are never remembered.</MoreInAdvanced>}

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
