"use client";

import { useState, useTransition } from "react";
import { saveSettingsAction } from "@/app/admin/(console)/tickets/actions";
import { choicesOf } from "@/lib/jonnybot-admin";
import type { GuildStructure, TicketSettings } from "@/lib/jonnybot-admin";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { andList } from "@/components/dashboard/ui/andList";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { ChannelSelect } from "./pickers";
import { FormField, inputClass } from "./ui";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

const shape = (s: TicketSettings) => JSON.stringify([s.logChannelId, s.transcriptDm, s.closeDelaySeconds, s.transcriptRetentionDays, s.autoCloseDays]);

/**
 * The settings every ticket panel shares. Basic is the log channel and whether the member gets a copy; Advanced adds how long transcripts are kept, the delay
 * before a closed ticket's channel is removed, closing quiet tickets automatically and the next ticket number. A limit that is already set stays visible in Basic.
 */
export function SettingsForm({ initial, structure, save: persist = saveSettingsAction }: { initial: TicketSettings; structure: GuildStructure; save?: typeof saveSettingsAction }) {
  const [baseline, setBaseline] = useState(initial);
  const [settings, setSettings] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, startTransition] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const dirty = shape(settings) !== shape(baseline);

  const showRetention = advanced || baseline.transcriptRetentionDays !== null;
  const showAutoClose = advanced || baseline.autoCloseDays !== null;
  const showDelay = advanced;
  const hidden = [!showRetention && "how long transcripts are kept", !showDelay && "the delay before a closed ticket's channel is removed", !showAutoClose && "closing quiet tickets automatically", !advanced && "the next ticket number"].filter(
    (name): name is string => typeof name === "string",
  );

  function submit() {
    setOutcome(null);
    startTransition(async () => {
      const result = await persist({
        logChannelId: settings.logChannelId,
        transcriptDm: settings.transcriptDm,
        closeDelaySeconds: settings.closeDelaySeconds,
        transcriptRetentionDays: settings.transcriptRetentionDays,
        autoCloseDays: settings.autoCloseDays,
      });
      if (!result.ok) {
        setOutcome({ tone: "error", title: result.error, items: result.problems });
        return;
      }
      setSettings(result.data);
      setBaseline(result.data);
      setOutcome({ tone: "success", title: "Settings saved." });
    });
  }

  const logName = structure.channels.find((c) => c.id === settings.logChannelId)?.name;

  return (
    <div className="space-y-4">
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="tickets-transcripts"
          title="Transcripts"
          hint="Every closed ticket's full conversation is saved, so it can be read here later."
          defaultOpen
          summary={
            <>
              <Chip tone={settings.logChannelId ? "good" : "plain"}>{settings.logChannelId ? `#${logName ?? "channel"}` : "No log channel"}</Chip>
              {settings.transcriptDm && <Chip>Member gets a copy</Chip>}
            </>
          }
        >
          <FieldGrid>
            <FormField label="Log channel" size="md" as="group" hint="A copy of each transcript is posted here. Leave empty to only store it.">
              <ChannelSelect {...choicesOf(structure)} value={settings.logChannelId} onChange={(id) => setSettings((s) => ({ ...s, logChannelId: id }))} none="No log channel" />
            </FormField>
            {showRetention && (
              <FormField label="Keep transcripts for (days)" size="sm" hint="Leave empty to keep them forever. Older transcripts are deleted; the ticket record itself stays.">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  className={inputClass}
                  value={settings.transcriptRetentionDays ?? ""}
                  placeholder="Forever"
                  onChange={(e) => setSettings((s) => ({ ...s, transcriptRetentionDays: e.target.value ? Number(e.target.value) : null }))}
                />
              </FormField>
            )}
          </FieldGrid>
          <Toggle
            checked={settings.transcriptDm}
            onChange={(on) => setSettings((s) => ({ ...s, transcriptDm: on }))}
            label="Also send the transcript to the person who opened the ticket"
            detail="Sent when their DMs are open."
          />
        </CollapsibleCard>

        {(showDelay || showAutoClose) && (
          <CollapsibleCard
            id="tickets-closing"
            title="Closing"
            hint="What happens after a ticket is closed, and to tickets nobody answers."
            defaultOpen
            summary={
              <>
                <Chip>{settings.closeDelaySeconds}s before the channel goes</Chip>
                <Chip tone={settings.autoCloseDays === null ? "plain" : "good"}>{settings.autoCloseDays === null ? "Never closed automatically" : `Quiet for ${settings.autoCloseDays}d closes`}</Chip>
              </>
            }
          >
            <FieldGrid>
              {showDelay && (
                <FormField label="Delay before the channel is deleted (seconds)" size="sm" hint="After a ticket is closed, its channel stays this long, then is removed. 0 to 300.">
                  <input
                    type="number"
                    min={0}
                    max={300}
                    className={inputClass}
                    value={settings.closeDelaySeconds}
                    onChange={(e) => setSettings((s) => ({ ...s, closeDelaySeconds: Number(e.target.value) || 0 }))}
                  />
                </FormField>
              )}
              {showAutoClose && (
                <FormField
                  label="Close quiet tickets after (days)"
                  size="sm"
                  hint="A ticket with no message for this long is closed automatically. It is warned a day before, and any reply cancels it. Leave empty to never close tickets automatically."
                >
                  <input
                    type="number"
                    min={1}
                    max={90}
                    className={inputClass}
                    value={settings.autoCloseDays ?? ""}
                    placeholder="Never"
                    onChange={(e) => setSettings((s) => ({ ...s, autoCloseDays: e.target.value ? Number(e.target.value) : null }))}
                  />
                </FormField>
              )}
            </FieldGrid>
          </CollapsibleCard>
        )}
      </PanelGrid>

      {advanced && (
        <p className="text-sm text-muted">
          Next ticket number: <span className="font-mono text-foreground">#{String(settings.nextNumber).padStart(4, "0")}</span> (counts up automatically).
        </p>
      )}

      {hidden.length > 0 && <MoreInAdvanced>{andList(hidden)}.</MoreInAdvanced>}

      <SaveBar
        pending={pending}
        onSave={submit}
        outcome={outcome}
        dirty={dirty}
        label="Save settings"
        onDiscard={() => {
          setSettings(baseline);
          setOutcome(null);
        }}
      />
    </div>
  );
}
