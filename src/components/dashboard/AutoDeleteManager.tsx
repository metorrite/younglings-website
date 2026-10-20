"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { RolePicker } from "@/components/dashboard/pickers";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
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
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import {
  choicesOf,
  type AutoDeleteDraft,
  type AutoDeleteList,
  type GuildRole,
  type GuildStructure,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

type Result = Promise<WelcomeActionResult<AutoDeleteList>>;

export interface AutoDeleteActions {
  save: (channelId: string, rule: AutoDeleteDraft) => Result;
  remove: (channelId: string) => Result;
}

type Problem = { title: string; items: string[] } | null;

/**
 * Channels that remove invites, links, files or messages with certain words when they are posted: the rules in force, and a form to add or change one. Basic is a
 * channel and what to delete there; Advanced adds the words, limiting the rule to (or excusing) people with a role, and waiting a few seconds before deleting. A
 * rule that already uses any of those keeps showing them in Basic.
 */
export function AutoDeleteManager({
  initial,
  structure,
  roles,
  actions,
}: {
  initial: AutoDeleteList;
  structure: GuildStructure;
  roles: GuildRole[];
  actions: AutoDeleteActions;
}) {
  const [list, setList] = useState(initial);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>(["INVITES"]);
  const [wordsText, setWordsText] = useState("");
  const [roleMode, setRoleMode] = useState<AutoDeleteDraft["roleMode"]>("EVERYONE");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [mode] = useViewMode();
  // a rule that already uses the extra controls keeps them on screen in Basic
  const usesExtras = initial.rules.some((r) => r.words.length > 0 || r.roleMode !== "EVERYONE" || r.delaySeconds > 0);
  const showExtras = mode === "advanced" || usesExtras || wordsText.trim() !== "" || roleMode !== "EVERYONE" || delaySeconds > 0;
  const words = wordsText.split("\n").map((w) => w.trim()).filter((w) => w !== "");
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

  const describe = (r: (typeof list.rules)[number]) =>
    [
      r.words.length > 0 && `${r.words.length} word${r.words.length === 1 ? "" : "s"}`,
      r.roleMode === "ONLY_WITH" && "only some roles",
      r.roleMode === "EXCEPT_WITH" && "not some roles",
      r.delaySeconds > 0 && `after ${r.delaySeconds}s`,
    ].filter((x): x is string => typeof x === "string");
  const toggle = (key: string, on: boolean) =>
    setFilters((f) => (on ? [...new Set([...f, key])] : f.filter((k) => k !== key)));
  const changing = list.rules.some((r) => r.channelId === channelId);

  return (
    <div className="space-y-4">
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
        <FormField label="Channel" size="md" as="group">
          <ChannelSelect
            {...choicesOf(structure)}
            onlyPostable={false}
            allowForums={false}
            value={channelId}
            onChange={setChannelId}
            none="Choose a channel…"
          />
        </FormField>
        <FormField label="Delete messages that contain" as="group" size="md">
          <div className="space-y-3">
            {list.available.filter((a) => a.key !== "TEXT").map((a) => (
              <Toggle
                key={a.key}
                checked={filters.includes(a.key)}
                onChange={(on) => toggle(a.key, on)}
                label={a.label}
              />
            ))}
          </div>
        </FormField>
        {showExtras ? (
          <>
            <FormField
              label="Delete messages containing these words"
              as="group"
              size="lg"
              hint={`One per line, at least ${list.minWordLength} characters, up to ${list.maxWords}. Capital letters don't matter and the words are matched as plain text anywhere in a message, so keep them specific.`}
            >
              <textarea className={inputClass} rows={4} value={wordsText} placeholder={"free nitro\nscam"} onChange={(e) => setWordsText(e.target.value)} />
            </FormField>
            <FormField label="Who the rule is for" as="group" size="lg">
              <div className="space-y-2 text-sm">
                {(
                  [
                    ["EVERYONE", "Everyone"],
                    ["ONLY_WITH", "Only people with one of these roles"],
                    ["EXCEPT_WITH", "Everyone except people with one of these roles"],
                  ] as const
                ).map(([value, text]) => (
                  <label key={value} className="flex items-start gap-2">
                    <input type="radio" name="ad-role-mode" className="mt-1" checked={roleMode === value} onChange={() => setRoleMode(value)} />
                    <span>{text}</span>
                  </label>
                ))}
              </div>
              {roleMode !== "EVERYONE" && (
                <div className="mt-2">
                  <RolePicker roles={roles.filter((r) => r.id)} value={roleIds} max={list.maxRoles} disabled={false} onChange={setRoleIds} />
                </div>
              )}
            </FormField>
            <FormField label="Wait before deleting (seconds)" size="sm" hint={`0 deletes at once, up to ${list.maxDelaySeconds}. If JonnyBot restarts during the wait, that message is not deleted.`}>
              <input
                type="number"
                min={0}
                max={list.maxDelaySeconds}
                className={inputClass}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Math.max(0, Math.min(list.maxDelaySeconds, Math.trunc(Number(e.target.value) || 0))))}
              />
            </FormField>
          </>
        ) : (
          <MoreInAdvanced>deleting messages with certain words, limiting a rule to (or excusing) people with a role, and waiting before deleting.</MoreInAdvanced>
        )}
        <button
          type="button"
          className={primaryButton}
          disabled={pending || !channelId || (filters.length === 0 && words.length === 0)}
          onClick={() =>
            run(
              () => actions.save(channelId!, { filters, words, roleMode, roleIds: roleMode === "EVERYONE" ? [] : roleIds, delaySeconds }),
              "Saved. It applies to the next message.",
            )
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
          <PanelGrid min="22rem" gap="gap-3">
            {list.rules.map((r) => (
              <div
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
                  {r.filters.filter((f) => f !== "TEXT").map((f) => (
                    <StatusBadge key={f} tone="muted">
                      {label(f)}
                    </StatusBadge>
                  ))}
                  {describe(r).map((d) => (
                    <StatusBadge key={d} tone="muted">
                      {d}
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
                      setFilters(r.filters.filter((f) => f !== "TEXT"));
                      setWordsText(r.words.join("\n"));
                      setRoleMode(r.roleMode);
                      setRoleIds(r.roleIds);
                      setDelaySeconds(r.delaySeconds);
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
              </div>
            ))}
          </PanelGrid>
        )}
      </section>
    </div>
  );
}
