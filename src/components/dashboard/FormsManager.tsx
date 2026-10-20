"use client";

import { useState, useTransition } from "react";
import { ChannelSelect, RoleSelect } from "@/components/admin/pickers";
import { FormField, ghostButton, inputClass, Notice, primaryButton, dangerButton } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid, Span } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { FormQuestion, FormQuestionKind, GuildStructure, WebFormAdmin, WebFormList, WebFormSubmissions } from "@/lib/jonnybot-admin";

type Result<T> = { ok: true; data: T } | { ok: false; error: string; problems: string[] };

export interface FormsActions {
  create: (template: string | null) => Promise<Result<WebFormList>>;
  save: (formId: string, form: unknown) => Promise<Result<WebFormList>>;
  remove: (formId: string) => Promise<Result<WebFormList>>;
  submissions: (formId: string) => Promise<Result<WebFormSubmissions>>;
}

const KIND_LABEL: Record<FormQuestionKind, string> = {
  SHORT: "Short answer",
  PARAGRAPH: "Long answer",
  CHOICE: "Pick one",
  CHECKBOX: "Tick box",
  RSN: "RuneScape name",
};

const shape = (f: WebFormAdmin) => JSON.stringify([f.name, f.title, f.description, f.enabled, f.panelId, f.channelId, f.roleId, f.onePerUser, f.cooldownHours, f.questions]);

function newQuestionId() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * The form builder: a list of this server's forms, each a folded card with its link, where answers go (a ticket panel, a channel, a role), how often a
 * person may send it, and its questions. A new form starts switched off. Nothing is hidden by the Basic / Advanced switch: a form is small enough to
 * show whole.
 */
export function FormsManager({
  guildId,
  initial,
  structure,
  publicBase,
  actions,
}: {
  guildId: string;
  initial: WebFormList;
  structure: GuildStructure;
  publicBase: string;
  actions: FormsActions;
}) {
  const [list, setList] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(initial.forms.length === 1 ? initial.forms[0].id : null);

  function create(template: string | null) {
    setError(null);
    start(async () => {
      const before = new Set(list.forms.map((f) => f.id));
      const result = await actions.create(template);
      if (!result.ok) return setError(result.error);
      setList(result.data);
      setOpenId(result.data.forms.find((f) => !before.has(f.id))?.id ?? null);
    });
  }

  const full = list.forms.length >= list.max;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButton} disabled={pending || full} onClick={() => create("clan-application")}>
          New clan application form
        </button>
        <button type="button" className={ghostButton} disabled={pending || full} onClick={() => create(null)}>
          New blank form
        </button>
        {full && <span className="text-sm text-muted">A server can have {list.max} forms. Delete one to add another.</span>}
      </div>
      {error && <Notice tone="error" title={error} />}

      {list.forms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-8 text-center">
          <p className="font-medium">No forms yet</p>
          <p className="mt-1 text-sm text-muted">Start from the clan application template (a name, a few questions about the person, the rules) or build your own.</p>
        </div>
      ) : (
        list.forms.map((form) => (
          <FormEditor
            key={form.id}
            form={form}
            limits={list.limits}
            panels={list.panels}
            structure={structure}
            guildId={guildId}
            publicBase={publicBase}
            open={openId === form.id}
            onOpenChange={(next) => setOpenId(next ? form.id : null)}
            actions={actions}
            onList={setList}
          />
        ))
      )}
    </div>
  );
}

function FormEditor({
  form,
  limits,
  panels,
  structure,
  guildId,
  publicBase,
  open,
  onOpenChange,
  actions,
  onList,
}: {
  form: WebFormAdmin;
  limits: WebFormList["limits"];
  panels: WebFormList["panels"];
  structure: GuildStructure;
  guildId: string;
  publicBase: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  actions: FormsActions;
  onList: (list: WebFormList) => void;
}) {
  const [saved, setSaved] = useState(form);
  const [draft, setDraft] = useState(form);
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string; items?: string[] } | null>(null);
  const [pending, start] = useTransition();
  const [submissions, setSubmissions] = useState<WebFormSubmissions | null>(null);
  const [copied, setCopied] = useState(false);
  const dirty = shape(draft) !== shape(saved);
  const link = `${publicBase}/forms/${guildId}/${form.id}`;

  const change = (patch: Partial<WebFormAdmin>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };
  const changeQuestion = (index: number, patch: Partial<FormQuestion>) => change({ questions: draft.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)) });
  const move = (index: number, by: -1 | 1) => {
    const next = [...draft.questions];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    change({ questions: next });
  };

  function save() {
    setOutcome(null);
    start(async () => {
      const result = await actions.save(form.id, draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems.length > 1 ? result.problems : undefined });
      onList(result.data);
      const fresh = result.data.forms.find((f) => f.id === form.id);
      if (fresh) {
        setSaved(fresh);
        setDraft(fresh);
      }
      setOutcome({ tone: "success", title: "Saved." });
    });
  }

  function remove() {
    if (!window.confirm(`Delete "${saved.name}" and every answer sent to it? This cannot be undone.`)) return;
    start(async () => {
      const result = await actions.remove(form.id);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error });
      onList(result.data);
    });
  }

  function showSubmissions() {
    start(async () => {
      const result = await actions.submissions(form.id);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error });
      setSubmissions(result.data);
    });
  }

  const where = [saved.panelId && panels.find((p) => p.id === saved.panelId)?.name, saved.channelId && `#${structure.channels.find((c) => c.id === saved.channelId)?.name ?? "channel"}`].filter(Boolean);

  return (
    <CollapsibleCard
      id={`form-${form.id}`}
      title={saved.name || "Untitled form"}
      open={open}
      onOpenChange={onOpenChange}
      summary={
        <>
          <Chip tone={saved.enabled ? "good" : "warn"}>{saved.enabled ? "On" : "Off"}</Chip>
          <Chip>{saved.questions.length} questions</Chip>
          <Chip>{saved.submissionCount} sent</Chip>
          {where.length > 0 ? <Chip>{where.join(" + ")}</Chip> : <Chip tone="warn">No place for answers</Chip>}
        </>
      }
    >
      <div className="space-y-6">
        <Toggle
          checked={draft.enabled}
          onChange={(next) => change({ enabled: next })}
          label="Taking answers"
          detail="Off, the link shows a not found page. A form needs at least one question and somewhere for the answers to go before it can be switched on."
        />

        <div className="space-y-2 rounded-lg border border-surface-border p-3 text-sm">
          <p className="font-medium">Link to share</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all text-xs text-muted">{link}</code>
            <button
              type="button"
              className={ghostButton}
              onClick={() => {
                void navigator.clipboard?.writeText(link).then(() => setCopied(true));
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>

        <FieldGrid>
          <FormField label="Name (only you see it)">
            <input className={inputClass} value={draft.name} maxLength={60} onChange={(e) => change({ name: e.target.value })} />
          </FormField>
          <FormField label="Title on the page">
            <input className={inputClass} value={draft.title} maxLength={100} onChange={(e) => change({ title: e.target.value })} />
          </FormField>
          <Span>
            <FormField label="Introduction" size="lg">
              <textarea className={inputClass} rows={3} value={draft.description} maxLength={1000} onChange={(e) => change({ description: e.target.value })} />
            </FormField>
          </Span>
        </FieldGrid>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Where the answers go</h3>
          <FieldGrid>
            <FormField label="Open a ticket in panel" hint="The person gets a private channel, like any ticket.">
              <select className={inputClass} value={draft.panelId ?? ""} onChange={(e) => change({ panelId: e.target.value || null })}>
                <option value="">No ticket</option>
                {panels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.enabled ? "" : " (closed)"}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Also post in channel">
              <ChannelSelect channels={structure.channels} value={draft.channelId} onChange={(id) => change({ channelId: id })} none="Nowhere" onlyPostable allowForums={false} />
            </FormField>
            <FormField label="Give the sender this role" hint="Only roles JonnyBot is allowed to hand out are accepted.">
              <RoleSelect roles={structure.roles} value={draft.roleId} onChange={(id) => change({ roleId: id })} none="No role" />
            </FormField>
          </FieldGrid>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">How often one person can send it</h3>
          <Toggle checked={draft.onePerUser} onChange={(next) => change({ onePerUser: next })} label="Only once per person" detail="Off, a person can send it again after the wait below." />
          {!draft.onePerUser && (
            <FormField label="Wait between sends (hours, 0 for none)" size="sm">
              <input
                className={inputClass}
                type="number"
                min={0}
                max={limits.cooldownHours}
                value={draft.cooldownHours}
                onChange={(e) => change({ cooldownHours: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })}
              />
            </FormField>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Questions</h3>
          {draft.questions.length === 0 && <p className="text-sm text-muted">No questions yet. Add the first one below.</p>}
          <ol className="space-y-3">
            {draft.questions.map((q, i) => (
              <li key={q.id} className="space-y-3 rounded-lg border border-surface-border p-3">
                <FieldGrid>
                  <Span>
                    <FormField label={`Question ${i + 1}`} size="lg">
                      <input className={inputClass} value={q.label} maxLength={80} onChange={(e) => changeQuestion(i, { label: e.target.value })} />
                    </FormField>
                  </Span>
                  <FormField label="Type">
                    <select
                      className={inputClass}
                      value={q.kind}
                      onChange={(e) => {
                        const kind = e.target.value as FormQuestionKind;
                        changeQuestion(i, { kind, maxLength: kind === "RSN" ? 12 : kind === "CHECKBOX" ? 3 : kind === "PARAGRAPH" ? 600 : 100, options: kind === "CHOICE" && q.options.length < 2 ? ["", ""] : q.options });
                      }}
                    >
                      {(Object.keys(KIND_LABEL) as FormQuestionKind[]).map((k) => (
                        <option key={k} value={k}>
                          {KIND_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  {(q.kind === "SHORT" || q.kind === "PARAGRAPH") && (
                    <FormField label="Longest answer (characters)" size="sm">
                      <input className={inputClass} type="number" min={1} max={limits.answerLength} value={q.maxLength} onChange={(e) => changeQuestion(i, { maxLength: Math.max(1, Math.trunc(Number(e.target.value) || 1)) })} />
                    </FormField>
                  )}
                </FieldGrid>
                {q.kind === "CHOICE" && (
                  <FormField label="Choices (one per line)" size="lg">
                    <textarea
                      className={inputClass}
                      rows={4}
                      value={q.options.join("\n")}
                      onChange={(e) => changeQuestion(i, { options: e.target.value.split("\n").slice(0, limits.options) })}
                    />
                  </FormField>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={q.required} onChange={(e) => changeQuestion(i, { required: e.target.checked })} />
                    Required
                  </label>
                  <span className="flex-1" />
                  <button type="button" className={ghostButton} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move question ${i + 1} up`}>
                    ↑
                  </button>
                  <button type="button" className={ghostButton} disabled={i === draft.questions.length - 1} onClick={() => move(i, 1)} aria-label={`Move question ${i + 1} down`}>
                    ↓
                  </button>
                  <button type="button" className={dangerButton} onClick={() => change({ questions: draft.questions.filter((_, j) => j !== i) })}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className={ghostButton}
            disabled={draft.questions.length >= limits.questions}
            onClick={() => change({ questions: [...draft.questions, { id: newQuestionId(), label: "", kind: "SHORT", required: false, options: [], maxLength: 100 }] })}
          >
            Add a question
          </button>
        </div>

        <SaveBar pending={pending} onSave={save} outcome={outcome} dirty={dirty} onDiscard={() => setDraft(saved)} inline label="Save form" />

        <div className="flex flex-wrap items-center gap-2 border-t border-surface-border pt-4">
          <button type="button" className={ghostButton} disabled={pending} onClick={showSubmissions}>
            {submissions ? "Refresh answers" : `Show the latest answers (${saved.submissionCount})`}
          </button>
          <span className="flex-1" />
          <button type="button" className={dangerButton} disabled={pending} onClick={remove}>
            Delete form
          </button>
        </div>

        {submissions && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Showing the newest {submissions.submissions.length} of {submissions.total}.
            </p>
            {submissions.submissions.length === 0 && <p className="text-sm text-muted">Nobody has sent this form yet.</p>}
            {submissions.submissions.map((s) => (
              <details key={s.id} className="rounded-lg border border-surface-border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {s.userName ?? `User ${s.userId}`} <span className="text-xs text-muted">· {new Date(s.at).toLocaleString()}</span>
                </summary>
                <dl className="mt-3 space-y-2 text-sm">
                  {s.answers.map((a, i) => (
                    <div key={`${a.label}-${i}`}>
                      <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{a.label}</dt>
                      <dd className="whitespace-pre-line">{a.value || "-"}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ))}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
