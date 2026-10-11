"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import {
  dangerButton,
  FormField,
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
  type AutoDeleteList,
  type GuildStructure,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

type Result = Promise<WelcomeActionResult<AutoDeleteList>>;

export interface AutoDeleteActions {
  save: (channelId: string, filters: string[]) => Result;
  remove: (channelId: string) => Result;
}

type Problem = { title: string; items: string[] } | null;

/** Channels that remove invites, links or files the moment they are posted: the rules in force, and a form to add or change one. */
export function AutoDeleteManager({
  initial,
  structure,
  actions,
}: {
  initial: AutoDeleteList;
  structure: GuildStructure;
  actions: AutoDeleteActions;
}) {
  const [list, setList] = useState(initial);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>(["INVITES"]);
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const label = (key: string) =>
    list.available.find((a) => a.key === key)?.label ?? key;

  function run(work: () => Result, done: string) {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await work();
      if (!result.ok)
        return setProblem({ title: result.error, items: result.problems });
      setList(result.data);
      setNote(done);
    });
  }

  const toggle = (key: string, on: boolean) =>
    setFilters((f) => (on ? [...new Set([...f, key])] : f.filter((k) => k !== key)));
  const changing = list.rules.some((r) => r.channelId === channelId);

  return (
    <div className="space-y-6">
      <CollapsibleCard
        id="ad-rule"
        title={changing ? "Change a channel's rule" : "Add a rule"}
        hint="Pick a channel and what to delete there."
        defaultOpen={list.rules.length === 0}
        summary={
          <Chip>
            {list.rules.length} {list.rules.length === 1 ? "channel" : "channels"}
          </Chip>
        }
        info="A message that breaks the rule is deleted at once and the person is told why in a note that disappears after a few seconds. Bots and anyone who can manage messages in that channel are never affected. JonnyBot needs View Channel and Manage Messages there."
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
        <FormField label="Delete messages that contain" as="group">
          <div className="space-y-3">
            {list.available.map((a) => (
              <Toggle
                key={a.key}
                checked={filters.includes(a.key)}
                onChange={(on) => toggle(a.key, on)}
                label={a.label}
              />
            ))}
          </div>
        </FormField>
        <button
          type="button"
          className={primaryButton}
          disabled={pending || !channelId || filters.length === 0}
          onClick={() =>
            run(() => actions.save(channelId!, filters), "Saved. It applies to the next message.")
          }
        >
          {pending ? "Saving…" : changing ? "Save changes" : "Add the rule"}
        </button>
      </CollapsibleCard>

      {problem && (
        <Notice tone="error" title={problem.title} items={problem.items} />
      )}
      {note && <Notice tone="success" title={note} />}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">
          Channels with a rule
        </h2>
        {list.rules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">
            No channel has a rule.
          </p>
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {list.rules.map((r) => (
              <li
                key={r.channelId}
                className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5"
              >
                <p className="font-semibold">
                  #{r.channelName ?? "deleted channel"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={r.problem ? "warn" : "good"}>
                    {r.problem ? "Not working" : "Active"}
                  </StatusBadge>
                  {r.filters.map((f) => (
                    <StatusBadge key={f} tone="muted">
                      {label(f)}
                    </StatusBadge>
                  ))}
                </div>
                {r.problem && (
                  <p className="text-sm text-amber-300">{r.problem}</p>
                )}
                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold"
                    onClick={() => {
                      setChannelId(r.channelId);
                      setFilters(r.filters);
                      setNote(null);
                      setProblem(null);
                    }}
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    className={dangerButton}
                    disabled={pending}
                    onClick={() =>
                      run(() => actions.remove(r.channelId), "Rule removed.")
                    }
                  >
                    Remove
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
