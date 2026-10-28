"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import {
  dangerButton,
  FormField,
  ghostButton,
  inputClass,
  Notice,
  primaryButton,
  StatusBadge,
} from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { andList } from "@/components/dashboard/ui/andList";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import {
  choicesOf,
  type AutoCleanFilters,
  type AutoCleanList,
  type AutoCleanPreview,
  type GuildStructure,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

type Result = Promise<WelcomeActionResult<AutoCleanList>>;

export interface AutoCleanActions {
  save: (channelId: string, maxAgeMinutes: number, keepPinned: boolean, filters: AutoCleanFilters) => Result;
  /** The dry run: counts what the rule would delete now and deletes nothing. */
  preview: (channelId: string, maxAgeMinutes: number, keepPinned: boolean, filters: AutoCleanFilters) => Promise<WelcomeActionResult<AutoCleanPreview>>;
  remove: (channelId: string) => Result;
}

const NO_FILTERS: AutoCleanFilters = { authors: "ALL", onlyWithAttachments: false, containsText: null };
const AUTHORS = [
  { key: "ALL", label: "Everyone's messages" },
  { key: "ONLY_BOTS", label: "Only bots' messages" },
  { key: "ONLY_HUMANS", label: "Only people's messages" },
] as const;

/** Which messages a rule is limited to, in words. */
export function describeFilters(f: AutoCleanFilters): string {
  const parts = [f.authors === "ONLY_BOTS" ? "from bots" : f.authors === "ONLY_HUMANS" ? "from people" : null, f.onlyWithAttachments ? "with attachments" : null, f.containsText ? `containing "${f.containsText}"` : null].filter(Boolean);
  return parts.length === 0 ? "every message" : `only messages ${parts.join(", ")}`;
}

const isFiltered = (f: AutoCleanFilters) => f.authors !== "ALL" || f.onlyWithAttachments || (f.containsText ?? "").trim() !== "";
const keyOf = (channelId: string | null, minutes: number, keepPinned: boolean, f: AutoCleanFilters) => JSON.stringify([channelId, minutes, keepPinned, f.authors, f.onlyWithAttachments, (f.containsText ?? "").trim()]);

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

/**
 * Channels that delete their own old messages: the rules in force, and a form to add or change one. Basic is a channel and how long messages stay (the usual
 * lengths); Advanced adds a length of your own in minutes and deleting pinned messages too. A length that isn't one of the usual ones and a rule that deletes pins
 * stay visible while you change them.
 */
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
  const [filters, setFilters] = useState<AutoCleanFilters>(NO_FILTERS);
  // the dry run for exactly this form: what it said, and which form it was for
  const [checked, setChecked] = useState<{ key: string; result: AutoCleanPreview } | null>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const showOwnLength = advanced || !AGES.some((a) => a.minutes === minutes);
  const showPins = advanced || !keepPinned;
  const showFilters = advanced || isFiltered(filters) || list.rules.some((r) => isFiltered(r));
  const hidden = [!showOwnLength && "a length of your own in minutes", !showPins && "deleting pinned messages too", !showFilters && "limiting it to bots, attachments or some text"].filter(
    (name): name is string => typeof name === "string",
  );

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

  const formKey = keyOf(channelId, minutes, keepPinned, filters);
  const filtered = isFiltered(filters);
  // a rule with a filter can only be saved after its dry run, and only while the form still matches that dry run
  const checkedNow = checked !== null && checked.key === formKey;
  const needsCheck = filtered && !checkedNow;

  function check() {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await actions.preview(channelId!, minutes, keepPinned, filters);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setChecked({ key: formKey, result: result.data });
    });
  }

  function edit(rule: AutoCleanList["rules"][number]) {
    setChannelId(rule.channelId);
    setMinutes(rule.maxAgeMinutes);
    setKeepPinned(rule.keepPinned);
    setFilters({ authors: rule.authors, onlyWithAttachments: rule.onlyWithAttachments, containsText: rule.containsText });
    setChecked(null);
    setNote(null);
    setProblem(null);
  }

  const changing = list.rules.some((r) => r.channelId === channelId);

  return (
    <div className="space-y-4">
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
        <FormField label="Delete messages older than" as="group" size="lg">
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
            {showOwnLength && (
              <span className="flex items-center gap-1.5 text-xs text-muted">
                or
                <span className="w-24">
                  <input
                    type="number"
                    min={list.minAge}
                    max={list.maxAge}
                    value={minutes}
                    aria-label="Minutes"
                    onChange={(e) => setMinutes(Math.trunc(Number(e.target.value) || list.minAge))}
                    className={inputClass}
                  />
                </span>
                minutes
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            Between {describeAge(list.minAge)} and {describeAge(list.maxAge)}.
          </p>
        </FormField>
        {showPins && (
          <Toggle
            checked={keepPinned}
            onChange={setKeepPinned}
            label="Keep pinned messages"
            detail="Pinned messages are never deleted."
          />
        )}
        {showFilters && (
          <div className="space-y-3 border-t border-surface-border pt-4">
            <p className="text-sm font-medium">Only delete</p>
            <FormField label="Whose messages" as="group" size="lg">
              <div className="flex flex-wrap gap-2">
                {AUTHORS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    aria-pressed={filters.authors === a.key}
                    onClick={() => setFilters({ ...filters, authors: a.key })}
                    className={`rounded-full border px-3 py-1 text-xs transition ${filters.authors === a.key ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </FormField>
            <Toggle
              checked={filters.onlyWithAttachments}
              onChange={(on) => setFilters({ ...filters, onlyWithAttachments: on })}
              label="Only messages with an attachment"
              detail="Pictures, files and videos. Plain text is kept."
            />
            <FormField label="Only messages containing" size="md" hint="Any capitals. Leave empty for any text.">
              <input
                className={inputClass}
                value={filters.containsText ?? ""}
                maxLength={list.maxTextLength}
                onChange={(e) => setFilters({ ...filters, containsText: e.target.value })}
                placeholder="e.g. free nitro"
              />
            </FormField>
            <p className="text-xs text-muted">A message has to match everything you set here to be deleted. Everything else is kept. With nothing set, every old message goes.</p>
          </div>
        )}
        {hidden.length > 0 && <MoreInAdvanced>{andList(hidden)}.</MoreInAdvanced>}
        {checkedNow && checked && (
          <div className="rounded-md border border-surface-border bg-background/40 p-3 text-sm" role="status">
            <p className="font-medium">
              {checked.result.matched === 0
                ? `Nothing in #${checked.result.channelName} would be deleted right now.`
                : `${checked.result.matched}${checked.result.mayHaveMore ? " or more" : ""} message${checked.result.matched === 1 ? "" : "s"} in #${checked.result.channelName} would be deleted right now.`}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Checked {checked.result.scanned} older message{checked.result.scanned === 1 ? "" : "s"}{checked.result.mayHaveMore ? ` (the check looks at up to ${checked.result.scanLimit}; a sweep keeps going the next time)` : ""}. Nothing was deleted.
            </p>
          </div>
        )}
        {needsCheck && <p className="text-xs text-amber-300">Check what it would delete before you save a rule with a filter.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={ghostButton} disabled={pending || !channelId} onClick={check}>
            {pending ? "Checking…" : "Check what it would delete"}
          </button>
          <button
            type="button"
            className={primaryButton}
            disabled={pending || !channelId || needsCheck}
            onClick={() =>
              run(
                () => actions.save(channelId!, minutes, keepPinned, filters),
                "Saved. The next sweep applies it.",
              )
            }
          >
            {pending ? "Saving…" : changing ? "Save changes" : "Start cleaning"}
          </button>
        </div>
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
          <PanelGrid min="22rem" gap="gap-3">
            {list.rules.map((r) => (
              <div
                key={r.channelId}
                className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5"
              >
                <div>
                  <p className="font-semibold">
                    #{r.channelName ?? "deleted channel"}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    Deletes {describeFilters(r)} older than {describeAge(r.maxAgeMinutes)}
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
              </div>
            ))}
          </PanelGrid>
        )}
      </section>
    </div>
  );
}
