"use client";

import { useState, useTransition } from "react";
import {
  dangerButton,
  inputClass,
  Notice,
  primaryButton,
} from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import type {
  Autopunish,
  AutopunishRule,
  WelcomeActionResult,
} from "@/lib/jonnybot-admin";

export interface AutopunishActions {
  save: (rules: AutopunishRule[]) => Promise<WelcomeActionResult<Autopunish>>;
}

const ACTIONS: { value: AutopunishRule["action"]; label: string }[] = [
  { value: "TIMEOUT", label: "Time out" },
  { value: "KICK", label: "Kick" },
  { value: "BAN", label: "Ban" },
];

const UNITS = [
  { label: "minutes", factor: 1 },
  { label: "hours", factor: 60 },
  { label: "days", factor: 1440 },
];

/** Splits minutes into the largest unit that divides them evenly, so 1440 reads "1 day" rather than "1440 minutes". */
function split(minutes: number) {
  const unit = [...UNITS].reverse().find((u) => minutes >= u.factor && minutes % u.factor === 0) ?? UNITS[0];
  return { amount: Math.max(1, minutes / unit.factor), factor: unit.factor };
}

function describe(r: AutopunishRule): string {
  if (r.action === "KICK") return "kicked";
  if (r.action === "BAN") return "banned";
  const { amount, factor } = split(r.timeoutMinutes);
  const unit = UNITS.find((u) => u.factor === factor)!.label;
  return `timed out for ${amount} ${amount === 1 ? unit.slice(0, -1) : unit}`;
}

const shape = (rules: AutopunishRule[]) => JSON.stringify(rules);

/**
 * Rules that act on a member automatically when their warning count reaches a number. Most servers only record warnings, so this is a panel of the Advanced view;
 * once a server has a rule it stays visible in Basic, and Basic says it is there.
 */
export function AutopunishEditor({
  initial,
  actions,
}: {
  initial: Autopunish;
  actions: AutopunishActions;
}) {
  const [saved, setSaved] = useState(initial);
  const [rules, setRules] = useState<AutopunishRule[]>(initial.rules);
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = shape(rules) !== shape(saved.rules);
  const [mode] = useViewMode();

  const change = (i: number, patch: Partial<AutopunishRule>) => {
    setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    setNote(null);
  };
  const add = () => {
    const used = new Set(rules.map((r) => r.threshold));
    let threshold = 3;
    while (used.has(threshold) && threshold < saved.maxThreshold) threshold++;
    setRules((rs) => [...rs, { threshold, action: "TIMEOUT", timeoutMinutes: 60 }]);
    setNote(null);
  };

  function submit() {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await actions.save(rules);
      if (!result.ok)
        return setProblem({ title: result.error, items: result.problems });
      setSaved(result.data);
      setRules(result.data.rules);
      setNote("Saved.");
    });
  }

  const missing = (a: AutopunishRule["action"]) =>
    (a === "TIMEOUT" && !saved.canTimeout) ||
    (a === "KICK" && !saved.canKick) ||
    (a === "BAN" && !saved.canBan);

  if (mode !== "advanced" && saved.rules.length === 0) {
    return <MoreInAdvanced>Autopunish: acting on a member automatically (time out, kick or ban) when they reach a number of warnings.</MoreInAdvanced>;
  }

  return (
    <CollapsibleCard
      id="warn-autopunish"
      title="Autopunish"
      hint="Act automatically when someone reaches a number of warnings."
      defaultOpen={saved.rules.length > 0}
      summary={
        saved.rules.length === 0 ? (
          <Chip>No rules</Chip>
        ) : (
          saved.rules.map((r) => (
            <Chip key={r.threshold}>
              {r.threshold}: {describe(r)}
            </Chip>
          ))
        )
      }
      info="Each rule fires once, at exactly that many warnings, so a fourth warning does not repeat what the third did. JonnyBot needs the matching permission (Moderate Members, Kick Members or Ban Members) and a role above the member's."
    >
      {rules.length === 0 && (
        <p className="text-sm text-muted">
          No rules yet. Warnings are only recorded.
        </p>
      )}
      <ul className="space-y-3">
        {rules.map((r, i) => {
          const { amount, factor } = split(r.timeoutMinutes || 60);
          return (
            <li
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-surface-border p-3 text-sm"
            >
              <span className="text-muted">At</span>
              <input
                type="number"
                min={1}
                max={saved.maxThreshold}
                aria-label="Warnings needed"
                value={r.threshold}
                onChange={(e) =>
                  change(i, { threshold: Math.trunc(Number(e.target.value) || 1) })
                }
                className={`${inputClass} w-16!`}
              />
              <span className="text-muted">warnings:</span>
              <select
                aria-label="Action"
                className={`${inputClass} w-32!`}
                value={r.action}
                onChange={(e) =>
                  change(i, {
                    action: e.target.value as AutopunishRule["action"],
                    timeoutMinutes:
                      e.target.value === "TIMEOUT" ? r.timeoutMinutes || 60 : 0,
                  })
                }
              >
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              {r.action === "TIMEOUT" && (
                <>
                  <span className="text-muted">for</span>
                  <input
                    type="number"
                    min={1}
                    aria-label="Timeout length"
                    value={amount}
                    onChange={(e) =>
                      change(i, {
                        timeoutMinutes:
                          Math.max(1, Math.trunc(Number(e.target.value) || 1)) *
                          factor,
                      })
                    }
                    className={`${inputClass} w-20!`}
                  />
                  <select
                    aria-label="Unit"
                    className={`${inputClass} w-28!`}
                    value={factor}
                    onChange={(e) =>
                      change(i, { timeoutMinutes: amount * Number(e.target.value) })
                    }
                  >
                    {UNITS.map((u) => (
                      <option key={u.factor} value={u.factor}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <button
                type="button"
                className={`${dangerButton} ml-auto`}
                onClick={() => {
                  setRules((rs) => rs.filter((_, j) => j !== i));
                  setNote(null);
                }}
              >
                Remove
              </button>
              {missing(r.action) && (
                <p className="w-full text-xs text-amber-300">
                  JonnyBot doesn&apos;t have the permission for this yet, so
                  saving is blocked until it does.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {problem && (
        <Notice tone="error" title={problem.title} items={problem.items} />
      )}
      {note && <Notice tone="success" title={note} />}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold disabled:opacity-50"
          disabled={rules.length >= saved.maxRules}
          onClick={add}
        >
          Add a rule
        </button>
        <button
          type="button"
          className={primaryButton}
          disabled={pending || !dirty}
          onClick={submit}
        >
          {pending ? "Saving…" : "Save rules"}
        </button>
        {dirty && (
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground"
            onClick={() => {
              setRules(saved.rules);
              setNote(null);
              setProblem(null);
            }}
          >
            Discard
          </button>
        )}
      </div>
    </CollapsibleCard>
  );
}
