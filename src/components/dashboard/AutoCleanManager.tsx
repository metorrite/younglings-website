"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import {
  dangerButton,
  FormField,
  inputClass,
  Notice,
  primaryButton,
  StatusBadge,
} from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import {
  choicesOf,
  type AutoCleanList,
  type GuildStructure,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

type Result = Promise<WelcomeActionResult<AutoCleanList>>;

export interface AutoCleanActions {
  save: (channelId: string, maxAgeMinutes: number, keepPinned: boolean) => Result;
  remove: (channelId: string) => Result;
}

type Problem = { title: string; items: string[] } | null;

const AGES = [
  { minutes: 60, label: "1 hour" },
  { minutes: 360, label: "6 hours" },
  { minutes: 1440, label: "1 day" },
  { minutes: 4320, label: "3 days" },
  { minutes: 10080, label: "1 week" },
];

/** Reads minutes as plain words: "1 day", "6 hours", "90 minutes". */
export function describeAge(minutes: number): string {
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${minutes} minutes`;
}

/** Channels that delete their own old messages: the rules in force, and a form to add or change one. */
export function AutoCleanManager({
  initial,
  structure,
  actions,
}: {
  initial: AutoCleanList;
  structure: GuildStructure;
  actions: AutoCleanActions;
}) {
  const [list, setList] = useState(initial);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(1440);
  const [keepPinned, setKeepPinned] = useState(true);
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(work: () => Result, done: string, after?: () => void) {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await work();
      if (!result.ok)
        return setProblem({ title: result.error, items: result.problems });
      setList(result.data);
      setNote(done);
      after?.();
    });
  }

  function edit(rule: AutoCleanList["rules"][number]) {
    setChannelId(rule.channelId);
    setMinutes(rule.maxAgeMinutes);
    setKeepPinned(rule.keepPinned);
    setNote(null);
    setProblem(null);
  }

  const changing = list.rules.some((r) => r.channelId === channelId);

  return (
    <div className="space-y-6">
      <CollapsibleCard
        id="ac-rule"
        title={changing ? "Change a channel's rule" : "Clean a channel"}
        hint="Pick a channel and how long messages stay."
        defaultOpen={list.rules.length === 0}
        summary={
          <Chip>
            {list.rules.length} {list.rules.length === 1 ? "channel" : "channels"}
          </Chip>
        }
        info="Messages older than the age you choose are deleted for good, checked every ten minutes. Pinned messages are kept unless you turn that off. JonnyBot needs View Channel, Read Message History and Manage Messages in the channel."
      >
        <FormField label="Channel" as="group">
          <ChannelSelect
            {...choicesOf(structure)}
            onlyPostable={false}
            allowForums={false}
            value={channelId}
            onChange={setChannelId}
            none="Choose a channel…"
          />
        </FormField>
        <FormField label="Delete messages older than" as="group">
          <div className="flex flex-wrap items-center gap-2">
            {AGES.map((a) => (
              <button
                key={a.minutes}
                type="button"
                aria-pressed={minutes === a.minutes}
                onClick={() => setMinutes(a.minutes)}
                className={`rounded-full border px-3 py-1 text-xs transition ${minutes === a.minutes ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
              >
                {a.label}
              </button>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-muted">
              or
              <input
                type="number"
                min={list.minAge}
                max={list.maxAge}
                value={minutes}
                aria-label="Minutes"
                onChange={(e) => setMinutes(Math.trunc(Number(e.target.value) || list.minAge))}
                className={`${inputClass} w-24`}
              />
              minutes
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Between {describeAge(list.minAge)} and {describeAge(list.maxAge)}.
          </p>
        </FormField>
        <Toggle
          checked={keepPinned}
          onChange={setKeepPinned}
          label="Keep pinned messages"
          detail="Pinned messages are never deleted."
        />
        <button
          type="button"
          className={primaryButton}
          disabled={pending || !channelId}
          onClick={() =>
            run(
              () => actions.save(channelId!, minutes, keepPinned),
              "Saved. The next sweep applies it.",
            )
          }
        >
          {pending ? "Saving…" : changing ? "Save changes" : "Start cleaning"}
        </button>
      </CollapsibleCard>

      {problem && (
        <Notice tone="error" title={problem.title} items={problem.items} />
      )}
      {note && <Notice tone="success" title={note} />}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">
          Cleaned channels
        </h2>
        {list.rules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">
            No channel is being cleaned.
          </p>
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {list.rules.map((r) => (
              <li
                key={r.channelId}
                className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5"
              >
                <div>
                  <p className="font-semibold">
                    #{r.channelName ?? "deleted channel"}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    Deletes messages older than {describeAge(r.maxAgeMinutes)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={r.problem ? "warn" : "good"}>
                    {r.problem ? "Not working" : "Active"}
                  </StatusBadge>
                  <StatusBadge tone="muted">
                    {r.keepPinned ? "Keeps pins" : "Pins deleted too"}
                  </StatusBadge>
                </div>
                {r.problem && (
                  <p className="text-sm text-amber-300">{r.problem}</p>
                )}
                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold"
                    onClick={() => edit(r)}
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    className={dangerButton}
                    disabled={pending}
                    onClick={() =>
                      run(() => actions.remove(r.channelId), "Stopped cleaning.")
                    }
                  >
                    Stop cleaning
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
