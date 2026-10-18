"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField } from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import {
  choicesOf,
  type GuildStructure,
  type ModLog,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

type Outcome = {
  tone: "error" | "success";
  title: string;
  items?: string[];
} | null;
type Draft = Pick<ModLog, "enabled" | "channelId" | "logBans" | "logTimeouts">;

const shape = (s: Draft) =>
  JSON.stringify([s.enabled, s.channelId, s.logBans, s.logTimeouts]);

/**
 * Where bans, unbans and timeouts are written, and which of them. Basic is the switch with its channel and a preview; Advanced adds choosing which actions get an
 * entry (both are logged to begin with, and the choice stays visible once either is switched off).
 */
export function ModLogForm({
  initial,
  structure,
  save,
}: {
  initial: ModLog;
  structure: GuildStructure;
  save: (draft: Draft) => Promise<WelcomeActionResult<ModLog>>;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(saved);
  const [mode] = useViewMode();
  const showWhat = mode === "advanced" || !saved.logBans || !saved.logTimeouts;
  const channelName = structure.channels.find(
    (c) => c.id === draft.channelId,
  )?.name;

  const change = (patch: Partial<ModLog>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save({
        enabled: draft.enabled,
        channelId: draft.channelId,
        logBans: draft.logBans,
        logTimeouts: draft.logTimeouts,
      });
      if (!result.ok)
        return setOutcome({
          tone: "error",
          title: result.error,
          items: result.problems,
        });
      setSaved(result.data);
      setDraft(result.data);
      setOutcome({
        tone: "success",
        title: draft.enabled
          ? "Saved. The moderation log is on."
          : "Saved. The moderation log is switched off.",
      });
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="modlog-where"
          title="Where"
          hint="Switch it on and choose the log channel."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.enabled ? "good" : "bad"}>
                {draft.enabled ? "On" : "Off"}
              </Chip>
              <Chip tone={draft.channelId ? "plain" : "warn"}>
                {draft.channelId
                  ? `#${channelName ?? "channel"}`
                  : "No channel"}
              </Chip>
            </>
          }
          info="Pick a channel only your moderators can see. Each ban, unban or timeout is written there as it happens."
        >
          <SettingRow
            title="Keep a moderation log"
            hint={
              draft.enabled
                ? "Entries are written to the channel."
                : "Nothing is written."
            }
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            offHint="Off: nothing is written. Your channel and choices are kept."
          >
            <FormField label="Log channel" size="md" as="group">
              <ChannelSelect
                {...choicesOf(structure)}
                onlyPostable
                allowForums={false}
                value={draft.channelId}
                onChange={(id) => change({ channelId: id })}
                none="Choose a channel…"
              />
            </FormField>
          </SettingRow>
          {!draft.canReadAuditLog && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              JonnyBot doesn&apos;t have the View Audit Log permission, so entries
              won&apos;t say who did it or why. Give it that permission in
              Discord&apos;s server settings to include those lines.
            </p>
          )}
        </CollapsibleCard>

        <CollapsibleCard
          id="modlog-preview"
          title="What an entry looks like"
          hint="A ban, as it is written to the channel."
          defaultOpen
          summary={
            <>
              {draft.logBans && <Chip>Bans</Chip>}
              {draft.logTimeouts && <Chip>Timeouts</Chip>}
              {!draft.logBans && !draft.logTimeouts && <Chip tone="warn">Nothing</Chip>}
            </>
          }
        >
          {showWhat && (
            <SettingRow
              title="What is logged"
              hint="Bans covers both bans and unbans. Timeouts covers a timeout starting and being lifted."
            >
              <Toggle
                checked={draft.logBans}
                onChange={(on) => change({ logBans: on })}
                label="Bans and unbans"
              />
              <Toggle
                checked={draft.logTimeouts}
                onChange={(on) => change({ logTimeouts: on })}
                label="Timeouts"
              />
            </SettingRow>
          )}
          <section
            aria-label="Preview"
            className="max-w-xl rounded-lg border border-surface-border bg-background/40 p-4"
          >
            <h3 className="text-sm font-semibold">Preview</h3>
            <div className="mt-3 rounded bg-[#313338] p-3 text-sm text-[#dbdee1]">
              <p className="mb-2 text-xs text-[#949ba4]">
                #{channelName ?? "mod-log"}
              </p>
              <div
                className="rounded border-l-4 bg-[#2b2d31] p-3"
                style={{ borderLeftColor: "#ed4245" }}
              >
                <p className="font-semibold text-white">Member banned</p>
                <p className="mt-2 text-xs">
                  <span className="text-[#949ba4]">Member</span>
                  <br />
                  <span className="text-[#c9cdfb]">@troll</span> (troll)
                </p>
                {draft.canReadAuditLog && (
                  <>
                    <p className="mt-2 text-xs">
                      <span className="text-[#949ba4]">By</span>
                      <br />
                      <span className="text-[#c9cdfb]">@Moderator</span>
                    </p>
                    <p className="mt-2 text-xs">
                      <span className="text-[#949ba4]">Reason</span>
                      <br />
                      Spamming links in general chat
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>
        </CollapsibleCard>
      </PanelGrid>

      {!showWhat && <MoreInAdvanced>choosing which actions get an entry (bans and unbans, timeouts).</MoreInAdvanced>}

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
