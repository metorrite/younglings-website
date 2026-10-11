"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, inputClass } from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Toggle } from "@/components/dashboard/ui/Toggle";
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

/** The minimum account age to join, and what happens to an account that is younger. */
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="min-w-0 space-y-4">
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
          <Toggle
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            label="Check accounts that join"
            detail={
              draft.enabled
                ? "Accounts younger than the minimum are dealt with."
                : "Every account can join."
            }
          />
          <FormField label="Minimum account age" as="group">
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
              <span className="flex items-center gap-1.5 text-xs text-muted">
                or
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
                  className={`${inputClass} w-20!`}
                />
                days
              </span>
            </div>
          </FormField>
        </CollapsibleCard>

        <CollapsibleCard
          id="gate-action"
          title="What happens"
          hint="Be told, or remove them as well."
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
          <FormField label="Action" as="group">
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
          {draft.action === "KICK" && !draft.canKick && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              JonnyBot doesn&apos;t have the Kick Members permission, so it
              can&apos;t remove accounts yet. Give it that in Discord&apos;s
              server settings first; saving is blocked until then.
            </p>
          )}
          <FormField label="Alert channel" as="group">
            <ChannelSelect
              {...choicesOf(structure)}
              onlyPostable
              allowForums={false}
              value={draft.alertChannelId}
              onChange={(id) => change({ alertChannelId: id })}
              none="No channel"
            />
          </FormField>
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
            <p className="mt-1 text-xs text-muted">
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
        </div>
      </div>
    </div>
  );
}
