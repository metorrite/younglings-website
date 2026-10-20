"use client";

import { useState, useTransition } from "react";
import { FormField, inputClass } from "@/components/admin/ui";
import { ChannelListPicker, RolePicker } from "@/components/dashboard/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { andList } from "@/components/dashboard/ui/andList";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import type { GuildStructure, HighlightSettings, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Draft = Pick<HighlightSettings, "enabled" | "maxKeywords" | "cooldownSeconds" | "excludedChannels" | "allowedRoles">;

const WAITS = [
  { seconds: 60, label: "1 minute" },
  { seconds: 300, label: "5 minutes" },
  { seconds: 900, label: "15 minutes" },
  { seconds: 3600, label: "1 hour" },
  { seconds: 21600, label: "6 hours" },
];
const shape = (s: Draft) => JSON.stringify([s.enabled, s.maxKeywords, s.cooldownSeconds, s.excludedChannels, s.allowedRoles]);
const waitLabel = (seconds: number) => WAITS.find((w) => w.seconds === seconds)?.label ?? (seconds % 60 === 0 ? `${seconds / 60} minutes` : `${seconds} seconds`);

/**
 * Highlights: members choose words and get a direct message when one is said in a channel they can see. The switch owns its limits; where it listens and who may
 * use it are rarely changed, so they are Advanced (and stay visible in Basic once something is saved there).
 */
export function HighlightsForm({
  initial,
  structure,
  save,
}: {
  initial: HighlightSettings;
  structure: GuildStructure;
  save: (draft: Draft) => Promise<WelcomeActionResult<HighlightSettings>>;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const dirty = shape(draft) !== shape(saved);
  const showWhere = advanced || saved.excludedChannels.length > 0 || saved.allowedRoles.length > 0;
  const hidden = [!showWhere && "channels to leave out and which roles may use it"].filter((x): x is string => typeof x === "string");

  const change = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save({ enabled: draft.enabled, maxKeywords: draft.maxKeywords, cooldownSeconds: draft.cooldownSeconds, excludedChannels: draft.excludedChannels, allowedRoles: draft.allowedRoles });
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setDraft(result.data);
      setOutcome({ tone: "success", title: draft.enabled ? "Saved. Members can now set words with /highlight or on their profile." : "Saved. Highlights are switched off." });
    });
  }

  return (
    <div className="space-y-4">
      {!saved.messageContent && (
        <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          JonnyBot is running without the <strong>Message Content</strong> intent, so it can&apos;t read messages and Highlights won&apos;t send anything. Turn it on in the Discord Developer Portal (Bot, Privileged Gateway
          Intents) and restart the bot.
        </p>
      )}
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="highlights-on"
          title="Highlights"
          hint="Switch it on and set the limits."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.enabled ? "good" : "bad"}>{draft.enabled ? "On" : "Off"}</Chip>
              <Chip>{saved.memberCount} member{saved.memberCount === 1 ? "" : "s"} · {saved.wordCount} word{saved.wordCount === 1 ? "" : "s"}</Chip>
            </>
          }
          info="Members pick words with /highlight add, or on their website profile. When someone says one in a channel the member can see, JonnyBot sends the member a direct message with a link. It never messages about channels a member can't see, and never about their own messages."
        >
          <SettingRow
            title="Run Highlights"
            hint={draft.enabled ? "Members' words are watched." : "Nothing is watched or sent."}
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            offHint="Off: nothing is watched. Members' words are kept."
          >
            <FormField label="Words per member" size="sm" info={`Up to ${saved.limits.maxKeywords}.`}>
              <input
                type="number"
                className={inputClass}
                min={1}
                max={saved.limits.maxKeywords}
                value={draft.maxKeywords}
                onChange={(e) => change({ maxKeywords: Math.max(1, Math.min(saved.limits.maxKeywords, Math.trunc(Number(e.target.value) || 1))) })}
              />
            </FormField>
            <FormField label="Wait between messages" size="md" info="After a word has sent a member a message, it stays quiet for them this long, so a busy chat doesn't flood their DMs.">
              <select className={inputClass} value={draft.cooldownSeconds} onChange={(e) => change({ cooldownSeconds: Number(e.target.value) })}>
                {!WAITS.some((w) => w.seconds === draft.cooldownSeconds) && <option value={draft.cooldownSeconds}>{waitLabel(draft.cooldownSeconds)}</option>}
                {WAITS.map((w) => (
                  <option key={w.seconds} value={w.seconds}>
                    {w.label}
                  </option>
                ))}
              </select>
            </FormField>
          </SettingRow>
        </CollapsibleCard>

        {showWhere && (
          <CollapsibleCard
            id="highlights-where"
            title="Where and who"
            hint="Channels to leave out, and which roles may use it."
            summary={
              <>
                <Chip>{draft.excludedChannels.length} channel{draft.excludedChannels.length === 1 ? "" : "s"} left out</Chip>
                <Chip>{draft.allowedRoles.length === 0 ? "Everyone" : `${draft.allowedRoles.length} role${draft.allowedRoles.length === 1 ? "" : "s"}`}</Chip>
              </>
            }
            info="Words are never watched in the channels you leave out (a thread counts as its channel). When you list roles, only members with one of them can use Highlights."
          >
            <FormField label="Channels to leave out" as="group" size="lg">
              <ChannelListPicker
                channels={structure.channels}
                allowForums={false}
                value={draft.excludedChannels}
                max={saved.limits.maxList}
                empty="Every channel is watched."
                onChange={(ids) => change({ excludedChannels: ids })}
              />
            </FormField>
            <FormField label="Roles that may use it" as="group" size="lg" info="Leave empty to let everyone.">
              <RolePicker roles={structure.roles} value={draft.allowedRoles} max={saved.limits.maxList} disabled={false} onChange={(ids) => change({ allowedRoles: ids })} />
            </FormField>
          </CollapsibleCard>
        )}
      </PanelGrid>

      {hidden.length > 0 && <MoreInAdvanced>{andList(hidden)}.</MoreInAdvanced>}

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
