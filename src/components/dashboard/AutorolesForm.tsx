"use client";

import { useState, useTransition } from "react";
import { FormField, inputClass } from "@/components/admin/ui";
import { RolePicker } from "@/components/dashboard/pickers";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type {
  Autoroles,
  GuildRole,
  WelcomeActionResult,
} from "@/lib/jonnybot-admin";

type Outcome = {
  tone: "error" | "success";
  title: string;
  items?: string[];
} | null;

const PRESETS = [
  { seconds: 0, label: "Right away" },
  { seconds: 10, label: "10 seconds" },
  { seconds: 60, label: "1 minute" },
  { seconds: 300, label: "5 minutes" },
  { seconds: 3600, label: "1 hour" },
  { seconds: 86400, label: "1 day" },
  { seconds: 604800, label: "7 days" },
];

const UNITS = [
  { seconds: 1, label: "seconds" },
  { seconds: 60, label: "minutes" },
  { seconds: 3600, label: "hours" },
  { seconds: 86400, label: "days" },
];

/** The largest unit the delay is a whole number of, so 7200 shows as "2 hours" rather than "7200 seconds". */
const unitFor = (seconds: number) =>
  [...UNITS].reverse().find((u) => seconds > 0 && seconds % u.seconds === 0)
    ?.seconds ?? 60;

const shape = (a: Autoroles) =>
  JSON.stringify([a.enabled, a.delaySeconds, a.memberRoleIds, a.botRoleIds]);

/** Roles handed to everyone who joins: one list for people, one for bots, switched on or off as a whole, with an optional delay. */
export function AutorolesForm({
  initial,
  roles,
  save,
}: {
  initial: Autoroles;
  roles: GuildRole[];
  save: (
    draft: Pick<
      Autoroles,
      "enabled" | "delaySeconds" | "memberRoleIds" | "botRoleIds"
    >,
  ) => Promise<WelcomeActionResult<Autoroles>>;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const [unit, setUnit] = useState(() => unitFor(initial.delaySeconds));
  const giveable = roles.filter((r) => !r.managed);
  const dirty = shape(draft) !== shape(saved);

  const change = (patch: Partial<Autoroles>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save({
        enabled: draft.enabled,
        delaySeconds: draft.delaySeconds,
        memberRoleIds: draft.memberRoleIds,
        botRoleIds: draft.botRoleIds,
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
          ? "Saved. New members will get these roles."
          : "Saved. Autoroles are switched off, so nothing will be given yet.",
      });
    });
  }

  const delayLabel =
    PRESETS.find((p) => p.seconds === draft.delaySeconds)?.label ??
    `${draft.delaySeconds / unit} ${UNITS.find((u) => u.seconds === unit)?.label}`;

  return (
    <div className="space-y-4">
      {draft.issues.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-medium">
            Some chosen roles can&apos;t be given out right now:
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {draft.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <CollapsibleCard
        id="autoroles-when"
        title="When they join"
        hint="Switch autoroles on, and choose how long to wait before giving the roles."
        defaultOpen
        summary={
          <>
            <Chip tone={draft.enabled ? "good" : "bad"}>
              {draft.enabled ? "On" : "Off"}
            </Chip>
            <Chip>{delayLabel}</Chip>
          </>
        }
        info="A delay holds the roles back for a moment after someone joins. That is useful if a role lets people into channels and you want a rules or verification step, or a screening bot, to get there first."
      >
        <Toggle
          checked={draft.enabled}
          onChange={(on) => change({ enabled: on })}
          label="Give new members these roles"
          detail={
            draft.enabled
              ? "Everyone who joins gets the roles below."
              : "Nothing is given until this is on. Your choices below are kept."
          }
        />
        <FormField
          label="Wait before giving them"
          as="group"
          info={`Up to ${Math.round(draft.maxDelaySeconds / 86400)} days.`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.seconds}
                type="button"
                aria-pressed={draft.delaySeconds === p.seconds}
                onClick={() => change({ delaySeconds: p.seconds })}
                className={`rounded-full border px-3 py-1 text-xs transition ${draft.delaySeconds === p.seconds ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
              >
                {p.label}
              </button>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-muted">
              or
              <input
                type="number"
                min={0}
                value={draft.delaySeconds / unit}
                aria-label="Delay"
                onChange={(e) =>
                  change({
                    delaySeconds: Math.max(
                      0,
                      Math.min(
                        draft.maxDelaySeconds,
                        Math.round((Number(e.target.value) || 0) * unit),
                      ),
                    ),
                  })
                }
                className={`${inputClass} w-20`}
              />
              <select
                value={unit}
                aria-label="Delay unit"
                onChange={(e) => setUnit(Number(e.target.value))}
                className={`${inputClass} w-28`}
              >
                {UNITS.map((u) => (
                  <option key={u.seconds} value={u.seconds}>
                    {u.label}
                  </option>
                ))}
              </select>
            </span>
          </div>
        </FormField>
      </CollapsibleCard>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <CollapsibleCard
          id="autoroles-people"
          title="Roles for people"
          hint="Given to everyone who joins."
          defaultOpen
          summary={
            <Chip tone={draft.memberRoleIds.length === 0 ? "warn" : "good"}>
              {draft.memberRoleIds.length === 0
                ? "None chosen"
                : `${draft.memberRoleIds.length} role${draft.memberRoleIds.length === 1 ? "" : "s"}`}
            </Chip>
          }
          info={`Up to ${draft.maxRoles} roles. JonnyBot only gives ordinary roles that sit below its own role and have no powerful permissions (like Administrator or Ban Members), so a role can't be used to take over the server.`}
        >
          <RolePicker
            roles={giveable}
            value={draft.memberRoleIds}
            max={draft.maxRoles}
            disabled={false}
            onChange={(ids) => change({ memberRoleIds: ids })}
          />
        </CollapsibleCard>

        <CollapsibleCard
          id="autoroles-bots"
          title="Roles for bots"
          hint="Given to bots that are added to the server."
          defaultOpen
          summary={
            <Chip tone={draft.botRoleIds.length === 0 ? "plain" : "good"}>
              {draft.botRoleIds.length === 0
                ? "None chosen"
                : `${draft.botRoleIds.length} role${draft.botRoleIds.length === 1 ? "" : "s"}`}
            </Chip>
          }
          info="A separate list so bots can be given a Bots role without people getting it too. Leave it empty if you don't need one."
        >
          <RolePicker
            roles={giveable}
            value={draft.botRoleIds}
            max={draft.maxRoles}
            disabled={false}
            onChange={(ids) => change({ botRoleIds: ids })}
          />
        </CollapsibleCard>
      </div>

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
