"use client";

import { confirmDialog } from "@/components/ui/Dialogs";
import { useState, useTransition } from "react";
import {
  dangerButton,
  FormField,
  inputClass,
  Notice,
  primaryButton,
} from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import type {
  AutoReplyDef,
  AutoReplyList,
  WelcomeActionResult,
} from "@/lib/jonnybot-admin";

export interface AutoReplyActions {
  save: (
    id: string | null,
    reply: Omit<AutoReplyDef, "id">,
  ) => Promise<WelcomeActionResult<AutoReplyDef>>;
  remove: (id: string) => Promise<WelcomeActionResult<AutoReplyList>>;
}

const MATCH: { value: AutoReplyDef["match"]; label: string; blurb: string }[] =
  [
    {
      value: "WORD",
      label: "Contains",
      blurb:
        "The trigger appears as a whole word or phrase anywhere in a message.",
    },
    {
      value: "STARTS",
      label: "Starts with",
      blurb: "A message begins with the trigger.",
    },
    {
      value: "EXACT",
      label: "Is exactly",
      blurb: "The whole message is the trigger.",
    },
  ];

const COOLDOWNS = [
  { seconds: 10, label: "10 seconds" },
  { seconds: 60, label: "1 minute" },
  { seconds: 600, label: "10 minutes" },
  { seconds: 3600, label: "1 hour" },
  { seconds: 86400, label: "1 day" },
];

const blank = (): AutoReplyDef => ({
  id: null,
  trigger: "",
  match: "WORD",
  reply: "",
  cooldownSeconds: 30,
  enabled: true,
});
const body = (r: AutoReplyDef) => ({
  trigger: r.trigger,
  match: r.match,
  reply: r.reply,
  cooldownSeconds: r.cooldownSeconds,
  enabled: r.enabled,
});
const shape = (r: AutoReplyDef) => JSON.stringify(body(r));

/** What a reply starts with when it is made; a reply that already differs keeps showing the matching and the wait in Basic. */
const DEFAULT_COOLDOWN = 30;

function ReplyCard({
  initial,
  limits,
  actions,
  onSaved,
  onRemoved,
  onCancel,
}: {
  initial: AutoReplyDef;
  limits: AutoReplyList;
  actions: AutoReplyActions;
  onSaved: (r: AutoReplyDef, was: AutoReplyDef) => void;
  onRemoved: (id: string) => void;
  onCancel: () => void;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [problem, setProblem] = useState<{
    title: string;
    items: string[];
  } | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(saved);
  const isNew = saved.id === null;
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const showMatch = advanced || saved.match !== "WORD";
  const showCooldown = advanced || saved.cooldownSeconds !== DEFAULT_COOLDOWN;

  const change = (patch: Partial<AutoReplyDef>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setProblem(null);
    setOk(false);
  };

  function save() {
    setProblem(null);
    start(async () => {
      const result = await actions.save(saved.id, body(draft));
      if (!result.ok)
        return setProblem({ title: result.error, items: result.problems });
      const was = saved;
      setSaved(result.data);
      setDraft(result.data);
      setOk(true);
      onSaved(result.data, was);
    });
  }

  async function remove() {
    if (isNew) return onCancel();
    if (!(await confirmDialog({ title: `Delete the reply to "${saved.trigger}"?`, confirmLabel: "Delete reply", tone: "danger" }))) return;
    start(async () => {
      const result = await actions.remove(saved.id!);
      if (!result.ok)
        return setProblem({ title: result.error, items: result.problems });
      onRemoved(saved.id!);
    });
  }

  return (
    <CollapsibleCard
      id={`ar-${saved.id ?? "new"}`}
      title={
        draft.trigger.trim()
          ? `“${draft.trigger.trim()}”`
          : "New automatic reply"
      }
      hint={
        draft.reply.trim()
          ? draft.reply.trim().slice(0, 90)
          : "Write what it should answer with."
      }
      defaultOpen={isNew}
      summary={
        <>
          <Chip tone={saved.enabled ? "good" : "bad"}>
            {saved.enabled ? "On" : "Off"}
          </Chip>
          <Chip>{MATCH.find((m) => m.value === saved.match)?.label}</Chip>
          {dirty && <Chip tone="warn">Unsaved</Chip>}
        </>
      }
    >
      <FieldGrid>
        {showMatch && (
          <FormField label="When a message…" as="group" size="lg">
            <div className="flex flex-wrap gap-2">
              {MATCH.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={draft.match === m.value}
                  title={m.blurb}
                  onClick={() => change({ match: m.value })}
                  className={`rounded-full border px-3 py-1 text-xs transition ${draft.match === m.value ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">
              {MATCH.find((m) => m.value === draft.match)?.blurb} Capital letters
              don&apos;t matter.
            </p>
          </FormField>
        )}
        <FormField label={showMatch ? "This text" : `When a message ${(MATCH.find((m) => m.value === draft.match)?.label ?? "contains").toLowerCase()}`} size="md">
          <input
            className={inputClass}
            value={draft.trigger}
            maxLength={limits.maxTrigger}
            placeholder="what is a ca"
            onChange={(e) => change({ trigger: e.target.value })}
          />
        </FormField>
      </FieldGrid>
      <FormField
        label="Reply with"
        size="lg"
        info="Use {user} to mention the person who wrote the message, and {server} for the server's name. It never pings @everyone or roles."
      >
        <textarea
          className={`${inputClass} min-h-24`}
          rows={3}
          value={draft.reply}
          maxLength={limits.maxReply}
          placeholder="Combat Achievements are… See /ca to look one up."
          onChange={(e) => change({ reply: e.target.value })}
        />
      </FormField>
      {showCooldown && (
        <FormField
          label="Wait before answering again"
          as="group"
          size="lg"
          info="Stops one busy channel turning a reply into spam. The wait applies across the whole server."
        >
          <div className="flex flex-wrap items-center gap-2">
            {COOLDOWNS.map((c) => (
              <button
                key={c.seconds}
                type="button"
                aria-pressed={draft.cooldownSeconds === c.seconds}
                onClick={() => change({ cooldownSeconds: c.seconds })}
                className={`rounded-full border px-3 py-1 text-xs transition ${draft.cooldownSeconds === c.seconds ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </FormField>
      )}
      <Toggle
        checked={draft.enabled}
        onChange={(on) => change({ enabled: on })}
        label="Active"
        detail={
          draft.enabled
            ? "JonnyBot answers matching messages."
            : "Switched off; kept for later."
        }
      />

      {problem && (
        <Notice tone="error" title={problem.title} items={problem.items} />
      )}
      {ok && !dirty && <Notice tone="success" title="Saved." />}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={primaryButton}
          disabled={pending || (!isNew && !dirty)}
          onClick={save}
        >
          {pending ? "Saving…" : isNew ? "Add this reply" : "Save"}
        </button>
        <button
          type="button"
          className={dangerButton}
          disabled={pending}
          onClick={remove}
        >
          {isNew ? "Cancel" : "Delete"}
        </button>
      </div>
    </CollapsibleCard>
  );
}

/** Automatic replies: a list of cards that open to edit, each saved on its own. */
export function AutoRepliesEditor({
  initial,
  actions,
}: {
  initial: AutoReplyList;
  actions: AutoReplyActions;
}) {
  const [replies, setReplies] = useState<AutoReplyDef[]>(initial.replies);
  const [drafts, setDrafts] = useState<number[]>([]); // keys of unsaved new cards
  const [next, setNext] = useState(0);
  const full = replies.length >= initial.max;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {replies.length} of {initial.max} used
        </p>
        <button
          type="button"
          className={primaryButton}
          disabled={full}
          onClick={() => {
            setDrafts((d) => [next, ...d]);
            setNext((n) => n + 1);
          }}
        >
          + New automatic reply
        </button>
      </div>

      {replies.length === 0 && drafts.length === 0 && (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center">
          <p className="font-medium">No automatic replies yet</p>
          <p className="mt-1 text-sm text-muted">
            Teach JonnyBot to answer common questions, such as how to join, what
            a command does, or where the rules are.
          </p>
        </div>
      )}

      <MoreInAdvanced>how a message is matched (contains, starts with, is exactly) and how long a reply waits before answering again.</MoreInAdvanced>

      <PanelGrid min="26rem">
      {drafts.map((key) => (
        <ReplyCard
          key={`draft-${key}`}
          initial={blank()}
          limits={initial}
          actions={actions}
          onSaved={(saved) => {
            setReplies((all) => [...all, saved]);
            setDrafts((d) => d.filter((k) => k !== key));
          }}
          onRemoved={() => {}}
          onCancel={() => setDrafts((d) => d.filter((k) => k !== key))}
        />
      ))}
      {replies.map((r) => (
        <ReplyCard
          key={r.id}
          initial={r}
          limits={initial}
          actions={actions}
          onSaved={(saved) =>
            setReplies((all) => all.map((x) => (x.id === saved.id ? saved : x)))
          }
          onRemoved={(id) =>
            setReplies((all) => all.filter((x) => x.id !== id))
          }
          onCancel={() => {}}
        />
      ))}
      </PanelGrid>
    </div>
  );
}
