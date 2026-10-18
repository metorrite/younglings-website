"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, inputClass } from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { andList } from "@/components/dashboard/ui/andList";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import {
  choicesOf,
  type AccountGate,
  type GuildStructure,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

type Outcome = {
  tone: "error" | "success";
  title: string;
  items?: string[];
} | null;
type Draft = Pick<
  AccountGate,
  "enabled" | "minAgeDays" | "action" | "alertChannelId"
>;

const PRESETS = [1, 3, 7, 14, 30];
const shape = (s: Draft) =>
  JSON.stringify([s.enabled, s.minAgeDays, s.action, s.alertChannelId]);

/**
 * The minimum account age to join, and what happens to an account that is younger. The order follows what you do: switch it on and pick an age, then say where
 * you are told. Basic is that, with the alert-only action; Advanced adds kicking the account as well and an age of your own in days (both stay visible once set).
 */
export function AccountGateForm({
  initial,
  structure,
  save,
}: {
  initial: AccountGate;
  structure: GuildStructure;
  save: (draft: Draft) => Promise<WelcomeActionResult<AccountGate>>;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(saved);
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const showAction = advanced || saved.action === "KICK";
  const showOwnAge = advanced || !PRESETS.includes(saved.minAgeDays);
  const hidden = [!showAction && "removing the account as well (alert and kick)", !showOwnAge && "an age of your own in days"].filter(
    (name): name is string => typeof name === "string",
  );
  const channelName = structure.channels.find(
    (c) => c.id === draft.alertChannelId,
  )?.name;

  const change = (patch: Partial<AccountGate>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save({
        enabled: draft.enabled,
        minAgeDays: draft.minAgeDays,
        action: draft.action,
        alertChannelId: draft.alertChannelId,
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
          ? "Saved. New accounts are being checked."
          : "Saved. The check is switched off.",
      });
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="gate-rule"
          title="The rule"
          hint="Switch it on and choose how old an account must be."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.enabled ? "good" : "bad"}>
                {draft.enabled ? "On" : "Off"}
              </Chip>
              <Chip>{draft.minAgeDays} days</Chip>
            </>
          }
          info="The age is counted from the day the Discord account was made, not the day it joined your server. Bots are never checked."
        >
          <SettingRow
            title="Check accounts that join"
            hint={
              draft.enabled
                ? "Accounts younger than the minimum are dealt with."
                : "Every account can join."
            }
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            offHint="Off: every account can join. Your choices are kept."
          >
            <FormField label="Minimum account age" as="group" size="lg">
              <div className="flex flex-wrap items-center gap-2">
                {PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={draft.minAgeDays === d}
                    onClick={() => change({ minAgeDays: d })}
                    className={`rounded-full border px-3 py-1 text-xs transition ${draft.minAgeDays === d ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
                  >
                    {d} {d === 1 ? "day" : "days"}
                  </button>
                ))}
                {showOwnAge && (
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    or
                    <span className="w-20">
                      <input
                        type="number"
                        min={1}
                        max={draft.maxAgeDays}
                        aria-label="Days"
                        value={draft.minAgeDays}
                        onChange={(e) =>
                          change({
                            minAgeDays: Math.max(
                              1,
                              Math.min(
                                draft.maxAgeDays,
                                Math.trunc(Number(e.target.value) || 1),
                              ),
                            ),
                          })
                        }
                        className={inputClass}
                      />
                    </span>
                    days
                  </span>
                )}
              </div>
            </FormField>
          </SettingRow>
        </CollapsibleCard>

        <CollapsibleCard
          id="gate-action"
          title="What happens"
          hint="Where you are told, and what the alert looks like."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.action === "KICK" ? "warn" : "plain"}>
                {draft.action === "KICK" ? "Alert and kick" : "Alert only"}
              </Chip>
              <Chip tone={draft.alertChannelId ? "plain" : "warn"}>
                {draft.alertChannelId
                  ? `#${channelName ?? "channel"}`
                  : "No channel"}
              </Chip>
            </>
          }
          info="Alert only posts a note in your channel and lets the account stay. Alert and kick also removes it, after a message telling the person when they can come back."
        >
          <FormField label="Alert channel" size="md" as="group">
            <ChannelSelect
              {...choicesOf(structure)}
              onlyPostable
              allowForums={false}
              value={draft.alertChannelId}
              onChange={(id) => change({ alertChannelId: id })}
              none="No channel"
            />
          </FormField>
          {showAction && (
            <FormField label="Action" as="group" size="lg">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["ALERT", "Alert only"],
                    ["KICK", "Alert and kick"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={draft.action === value}
                    onClick={() => change({ action: value })}
                    className={`rounded-md border px-4 py-2 text-sm transition ${draft.action === value ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FormField>
          )}
          {draft.action === "KICK" && !draft.canKick && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              JonnyBot doesn&apos;t have the Kick Members permission, so it
              can&apos;t remove accounts yet. Give it that in Discord&apos;s
              server settings first; saving is blocked until then.
            </p>
          )}
          <section
            aria-label="Preview"
            className="max-w-xl rounded-lg border border-surface-border bg-background/40 p-4"
          >
            <h3 className="text-sm font-semibold">Preview</h3>
            <p className="mt-0.5 text-xs text-muted">
              What the alert looks like.
            </p>
            <div className="mt-3 rounded bg-[#313338] p-3 text-sm text-[#dbdee1]">
              <p className="mb-2 text-xs text-[#949ba4]">
                #{channelName ?? "alerts"}
              </p>
              <div
                className="rounded border-l-4 bg-[#2b2d31] p-3"
                style={{
                  borderLeftColor:
                    draft.action === "KICK" ? "#ed4245" : "#fee75c",
                }}
              >
                <p className="font-semibold text-white">
                  {draft.action === "KICK"
                    ? "New account removed"
                    : "New account joined"}
                </p>
                <p className="mt-2 text-xs">
                  <span className="text-[#949ba4]">Member</span>
                  <br />
                  <span className="text-[#c9cdfb]">@fresh_face</span>{" "}
                  (fresh_face)
                </p>
                <p className="mt-2 text-xs">
                  <span className="text-[#949ba4]">Account age</span>
                  <br />
                  {Math.max(1, Math.floor(draft.minAgeDays / 2))}{" "}
                  {Math.max(1, Math.floor(draft.minAgeDays / 2)) === 1
                    ? "day"
                    : "days"}
                </p>
              </div>
            </div>
          </section>
        </CollapsibleCard>
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
