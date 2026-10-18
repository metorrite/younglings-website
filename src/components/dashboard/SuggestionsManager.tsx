"use client";

import { confirmDialog } from "@/components/ui/Dialogs";
import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import {
  dangerButton,
  formatUtc,
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
import {
  choicesOf,
  type GuildStructure,
  type SuggestionItem,
  type SuggestionList,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

type Result = Promise<WelcomeActionResult<SuggestionList>>;
type Run = (work: () => Result, done: string) => void;

export interface SuggestionActions {
  saveChannel: (channelId: string | null) => Result;
  decide: (id: string, status: string, note: string) => Result;
  remove: (id: string) => Result;
}

type Problem = { title: string; items: string[] } | null;

const DECISIONS = [
  { status: "APPROVED", label: "Approve", done: "Approved." },
  { status: "DENIED", label: "Deny", done: "Denied." },
  { status: "IMPLEMENTED", label: "Mark implemented", done: "Marked implemented." },
];

/** The suggestions channel, and every recent suggestion with its votes and a way to reply to it. */
export function SuggestionsManager({
  initial,
  structure,
  actions,
}: {
  initial: SuggestionList;
  structure: GuildStructure;
  actions: SuggestionActions;
}) {
  const [list, setList] = useState(initial);
  const [channelId, setChannelId] = useState<string | null>(initial.channelId);
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run: Run = (work, done) => {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await work();
      if (!result.ok)
        return setProblem({ title: result.error, items: result.problems });
      setList(result.data);
      setChannelId(result.data.channelId);
      setNote(done);
    });
  };

  const open = list.suggestions.filter((s) => s.status === "PENDING");
  const decided = list.suggestions.filter((s) => s.status !== "PENDING");

  return (
    <div className="space-y-6">
      <CollapsibleCard
        id="sg-channel"
        title="Suggestions channel"
        hint="Where /suggest posts ideas."
        defaultOpen={!list.channelId}
        summary={
          list.channelId ? <Chip>Channel chosen</Chip> : <Chip>Not set up</Chip>
        }
        info="Members can only use /suggest once a channel is chosen. JonnyBot needs permission to view it, send messages and embed links there."
      >
        <FormField label="Channel" as="group">
          <ChannelSelect
            {...choicesOf(structure)}
            onlyPostable
            allowForums={false}
            value={channelId}
            onChange={setChannelId}
            none="No channel (suggestions off)"
          />
        </FormField>
        <button
          type="button"
          className={primaryButton}
          disabled={pending || channelId === list.channelId}
          onClick={() => run(() => actions.saveChannel(channelId), "Saved.")}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </CollapsibleCard>

      {problem && (
        <Notice tone="error" title={problem.title} items={problem.items} />
      )}
      {note && <Notice tone="success" title={note} />}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">
          Waiting for a reply
        </h2>
        {open.length === 0 ? (
          <Empty text="No suggestions are waiting." />
        ) : (
          <Cards items={open} actions={actions} run={run} pending={pending} maxNote={list.maxNote} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">
          Replied to
        </h2>
        {decided.length === 0 ? (
          <Empty text="Nothing has been decided yet." />
        ) : (
          <Cards items={decided} actions={actions} run={run} pending={pending} maxNote={list.maxNote} />
        )}
      </section>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">
      {text}
    </p>
  );
}

function Cards(props: {
  items: SuggestionItem[];
  actions: SuggestionActions;
  run: Run;
  pending: boolean;
  maxNote: number;
}) {
  const { items, ...rest } = props;
  return (
    <ul className="grid gap-3 xl:grid-cols-2">
      {items.map((s) => (
        <SuggestionCard key={s.id} s={s} {...rest} />
      ))}
    </ul>
  );
}

function SuggestionCard({
  s,
  actions,
  run,
  pending,
  maxNote,
}: {
  s: SuggestionItem;
  actions: SuggestionActions;
  run: Run;
  pending: boolean;
  maxNote: number;
}) {
  const [reply, setReply] = useState(s.note ?? "");
  const tone =
    s.status === "APPROVED" || s.status === "IMPLEMENTED"
      ? "good"
      : s.status === "DENIED"
        ? "warn"
        : "muted";
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          #{s.id} · {s.authorName ?? "Someone who left"} ·{" "}
          {formatUtc(s.createdAt)}
        </p>
        <StatusBadge tone={tone}>
          {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
        </StatusBadge>
      </div>
      <p className="break-words whitespace-pre-wrap">{s.content}</p>
      <p className="text-sm text-muted">
        👍 {s.ups} · 👎 {s.downs}
      </p>
      <FormField label="Your reply (optional, shown on the message)">
        <input
          className={inputClass}
          value={reply}
          maxLength={maxNote}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Thanks, we will look into it"
        />
      </FormField>
      <div className="mt-auto flex flex-wrap gap-2">
        {DECISIONS.filter((d) => d.status !== s.status).map((d) => (
          <button
            key={d.status}
            type="button"
            className={ghostButton}
            disabled={pending}
            onClick={() => run(() => actions.decide(s.id, d.status, reply), d.done)}
          >
            {d.label}
          </button>
        ))}
        {s.status !== "PENDING" && (
          <button
            type="button"
            className={ghostButton}
            disabled={pending}
            onClick={() =>
              run(() => actions.decide(s.id, "PENDING", ""), "Reopened for voting.")
            }
          >
            Reopen
          </button>
        )}
        <button
          type="button"
          className={dangerButton}
          disabled={pending}
          onClick={async () =>
            (await confirmDialog({ title: "Delete this suggestion?", body: "Its message is taken down.", confirmLabel: "Delete", tone: "danger" })) &&
            run(() => actions.remove(s.id), "Deleted.")
          }
        >
          Delete
        </button>
      </div>
    </li>
  );
}
