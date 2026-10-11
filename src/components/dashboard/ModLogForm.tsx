"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField } from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Toggle } from "@/components/dashboard/ui/Toggle";
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

/** Where bans, unbans and timeouts are written, and which of them. */
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="min-w-0 space-y-4">
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
          <Toggle
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            label="Keep a moderation log"
            detail={
              draft.enabled
                ? "Entries are written to the channel."
                : "Nothing is written."
            }
          />
          <FormField label="Log channel" as="group">
            <ChannelSelect
              {...choicesOf(structure)}
              onlyPostable
              allowForums={false}
              value={draft.channelId}
              onChange={(id) => change({ channelId: id })}
              none="Choose a channel…"
            />
          </FormField>
        </CollapsibleCard>

        <CollapsibleCard
          id="modlog-what"
          title="What is logged"
          hint="Choose which actions get an entry."
          defaultOpen
          summary={
            <>
              {draft.logBans && <Chip>Bans</Chip>}
              {draft.logTimeouts && <Chip>Timeouts</Chip>}
              {!draft.logBans && !draft.logTimeouts && <Chip tone="warn">Nothing</Chip>}
            </>
          }
          info="Bans covers both bans and unbans. Timeouts covers a timeout starting and being lifted."
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
          {!draft.canReadAuditLog && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              JonnyBot doesn&apos;t have the View Audit Log permission, so entries
              won&apos;t say who did it or why. Give it that permission in
              Discord&apos;s server settings to include those lines.
            </p>
          )}
        </CollapsibleCard>

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

      <div className="min-w-0">
        <div className="xl:sticky xl:top-4">
          <section className="rounded-xl border border-surface-border bg-surface p-5">
            <h2 className="font-semibold text-gold">Preview</h2>
            <p className="mt-1 text-xs text-muted">How an entry looks.</p>
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
        </div>
      </div>
    </div>
  );
}
