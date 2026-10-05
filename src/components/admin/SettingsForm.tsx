"use client";

import { useState, useTransition } from "react";
import { saveSettingsAction } from "@/app/admin/(console)/tickets/actions";
import type { GuildStructure, TicketSettings } from "@/lib/jonnybot-admin";
import { ChannelSelect } from "./pickers";
import { Card, FormField, inputClass, Notice, primaryButton } from "./ui";

export function SettingsForm({ initial, structure }: { initial: TicketSettings; structure: GuildStructure }) {
  const [settings, setSettings] = useState(initial);
  const [error, setError] = useState<{ message: string; problems: string[] } | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveSettingsAction({
        logChannelId: settings.logChannelId,
        transcriptDm: settings.transcriptDm,
        closeDelaySeconds: settings.closeDelaySeconds,
        transcriptRetentionDays: settings.transcriptRetentionDays,
      });
      if (!result.ok) {
        setError({ message: result.error, problems: result.problems });
        return;
      }
      setSettings(result.data);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-6">
      <Card title="Transcripts" hint="Every closed ticket's full conversation is saved, so it can be read here later.">
        <FormField label="Log channel" hint="A copy of each transcript is posted here. Leave empty to only store it.">
          <ChannelSelect
            channels={structure.channels}
            value={settings.logChannelId}
            onChange={(id) => setSettings((s) => ({ ...s, logChannelId: id }))}
            none="No log channel"
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.transcriptDm}
            onChange={(e) => setSettings((s) => ({ ...s, transcriptDm: e.target.checked }))}
          />
          Also send the transcript to the person who opened the ticket (when their DMs are open)
        </label>
        <FormField label="Keep transcripts for (days)" hint="Leave empty to keep them forever. Older transcripts are deleted; the ticket record itself stays.">
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
      </Card>

      <Card title="Closing">
        <FormField label="Delay before the channel is deleted (seconds)" hint="After a ticket is closed, its channel stays this long, then is removed. 0 to 300.">
          <input
            type="number"
            min={0}
            max={300}
            className={inputClass}
            value={settings.closeDelaySeconds}
            onChange={(e) => setSettings((s) => ({ ...s, closeDelaySeconds: Number(e.target.value) || 0 }))}
          />
        </FormField>
      </Card>

      <p className="text-sm text-muted">
        Next ticket number: <span className="font-mono text-foreground">#{String(settings.nextNumber).padStart(4, "0")}</span> (counts up automatically).
      </p>

      {error && <Notice tone="error" title={error.message} items={error.problems} />}
      {saved && <Notice tone="success" title="Settings saved." />}

      <button type="button" className={primaryButton} disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
