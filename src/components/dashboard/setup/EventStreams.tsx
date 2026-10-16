"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Card, formatUtc, FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import type { EventCall } from "@/components/dashboard/EventListView";
import { QuickSetup } from "@/components/dashboard/setup/QuickSetup";
import { localInputToIso, MIN_NAME, type EventDraft, type EventKind, type OptionSchema, type SavedTemplate } from "@/lib/eventOptions";
import type { GuildStructure } from "@/lib/jonnybot-admin";

export interface DraftList {
  drafts: EventDraft[];
  max: number;
}

export interface TemplateList {
  templates: SavedTemplate[];
  max: number;
}

type StreamKey = "standard" | "quick" | "guided";

const STREAMS: { key: StreamKey; label: string; blurb: string }[] = [
  { key: "standard", label: "Standard", blurb: "Every option is filled in with the usual choice. Nothing to answer." },
  { key: "quick", label: "Quick", blurb: "Only the few questions that matter. The rest is standard." },
  { key: "guided", label: "Guided", blurb: "Every option, a step at a time, saved as a draft as you go." },
];
const STREAM_LABEL: Record<string, string> = { standard: "Standard", quick: "Quick", guided: "Guided" };

type Problem = { title: string; items: string[] } | null;

/**
 * Starting an event: the kind, then the stream (standard, quick or guided), plus the unfinished setups to carry on with and the saved templates to make
 * similar events from.
 */
export function EventStreams({
  guildId,
  kinds,
  initialDrafts,
  initialTemplates,
  structure,
  call,
}: {
  guildId: string;
  kinds: EventKind[];
  initialDrafts: DraftList;
  initialTemplates: TemplateList;
  structure: GuildStructure;
  call: EventCall;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<string>(() => kinds.find((k) => k.key === "bingo")?.key ?? kinds[0]?.key ?? "custom");
  const [stream, setStream] = useState<StreamKey>("quick");
  const [schemas, setSchemas] = useState<Record<string, OptionSchema>>({});
  const [loadProblem, setLoadProblem] = useState<Problem>(null);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [templates, setTemplates] = useState(initialTemplates);
  const [problem, setProblem] = useState<Problem>(null);
  const [pending, start] = useTransition();

  const schema = schemas[kind];
  const current = kinds.find((k) => k.key === kind);

  useEffect(() => {
    if (schemas[kind]) return;
    let cancelled = false;
    call("GET", `events/setup/schema/${kind}`).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setLoadProblem(null);
        setSchemas((all) => ({ ...all, [kind]: result.data as OptionSchema }));
      } else setLoadProblem({ title: result.error, items: result.problems });
    });
    return () => {
      cancelled = true;
    };
  }, [kind, schemas, call]);

  function startGuided() {
    setProblem(null);
    start(async () => {
      const result = await call("POST", "events/drafts", { template: kind, stream: "guided" });
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      router.push(`/dashboard/${guildId}/event-manager/new?draft=${(result.data as { draft: EventDraft }).draft.id}`);
    });
  }

  function deleteDraft(d: EventDraft) {
    if (!window.confirm(`Throw away the unfinished setup "${d.title}"?`)) return;
    setProblem(null);
    start(async () => {
      const result = await call("DELETE", `events/drafts/${d.id}`);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setDrafts(result.data as DraftList);
    });
  }

  const atDraftLimit = drafts.drafts.length >= drafts.max;

  return (
    <div className="space-y-6">
      <Card title="Start a new event" hint="Choose the kind of event, then how much you want to decide yourself. Everything can be changed afterwards while the event is a draft or taking signups.">
        {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
        <FormField label="Kind of event" hint={current?.description}>
          <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value)}>
            {kinds.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </FormField>

        <div role="radiogroup" aria-label="How to set it up" className="grid gap-3 md:grid-cols-3">
          {STREAMS.map((s) => {
            const selected = stream === s.key;
            return (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setStream(s.key)}
                className={`rounded-lg border p-3 text-left transition ${selected ? "border-gold bg-gold/10 ring-1 ring-gold/60" : "border-surface-border hover:border-gold/60"}`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span aria-hidden className={`inline-block size-3 rounded-full border ${selected ? "border-gold bg-gold" : "border-muted"}`} />
                  {s.label}
                </span>
                <span className="mt-1 block text-xs text-muted">{s.blurb}</span>
              </button>
            );
          })}
        </div>

        {stream === "guided" ? (
          <div className="space-y-3 rounded-lg border border-surface-border p-4">
            <p className="text-sm text-muted">
              Walks through every option of {current ? `a ${current.label.toLowerCase()}` : "the event"}: the basics, when, the rules, players, buy-in and prizes, Discord channels, and the setup steps and verification.
              It only stops you going on when something required is missing, and it keeps a draft as you go, so you can stop and come back from the list of unfinished setups.
            </p>
            {atDraftLimit && <p className="text-sm text-amber-300">You have {drafts.max} unfinished setups, which is the most. Finish or throw one away first.</p>}
            <button type="button" className={primaryButton} disabled={pending || atDraftLimit} onClick={startGuided}>
              {pending ? "Starting…" : "Start the guided setup"}
            </button>
          </div>
        ) : schema ? (
          <QuickSetup key={`${schema.template}-${stream}`} guildId={guildId} stream={stream} schema={schema} structure={structure} call={call} />
        ) : loadProblem ? (
          <Notice tone="error" title={loadProblem.title} items={loadProblem.items} />
        ) : (
          <p className="text-sm text-muted">Loading the options…</p>
        )}
      </Card>

      {drafts.drafts.length > 0 && (
        <Card title="Unfinished setups" hint={`Guided setups you started and haven't finished (up to ${drafts.max}). Nothing is created until you finish one.`}>
          <ul className="divide-y divide-surface-border">
            {drafts.drafts.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="break-words font-medium">{d.title}</p>
                  <p className="text-xs text-muted">
                    {d.templateLabel} · {STREAM_LABEL[d.stream] ?? d.stream} · {d.missingCount === 0 ? "ready to create" : `${d.missingCount} ${d.missingCount === 1 ? "thing" : "things"} still needed`} · saved {formatUtc(d.updatedAt)}
                    {d.createdByName ? ` · started by ${d.createdByName}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Link href={`/dashboard/${guildId}/event-manager/new?draft=${d.id}`} className="text-gold hover:underline">
                    Continue
                  </Link>
                  <button type="button" className="text-red-400 underline" disabled={pending} onClick={() => deleteDraft(d)}>
                    Throw away
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Your templates" hint={`A setup kept under a name, to make similar events from (up to ${templates.max}). Save one from the overview of any event.`}>
        {templates.templates.length === 0 ? (
          <p className="text-sm text-muted">None yet. Open an event you set up how you like it and use &ldquo;Save as a template&rdquo; on its overview.</p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {templates.templates.map((t) => (
              <TemplateRow key={t.id} t={t} guildId={guildId} call={call} onList={setTemplates} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function TemplateRow({ t, guildId, call, onList }: { t: SavedTemplate; guildId: string; call: EventCall; onList: (list: TemplateList) => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "use" | "edit">("view");
  const [name, setName] = useState(t.name);
  const [description, setDescription] = useState(t.description);
  const [eventName, setEventName] = useState(t.name);
  const [startsAt, setStartsAt] = useState("");
  const [problem, setProblem] = useState<Problem>(null);
  const [pending, start] = useTransition();

  function run(work: () => Promise<Problem>) {
    setProblem(null);
    start(async () => setProblem(await work()));
  }

  const useIt = () =>
    run(async () => {
      const body: Record<string, unknown> = { name: eventName.trim() };
      const iso = localInputToIso(startsAt);
      if (iso) body.startsAt = iso;
      const result = await call("POST", `events/saved-templates/${t.id}/create`, body);
      if (!result.ok) return { title: result.error, items: result.problems };
      router.push(`/dashboard/${guildId}/event-manager/${(result.data as { id: string }).id}`);
      return null;
    });

  const rename = () =>
    run(async () => {
      const result = await call("PUT", `events/saved-templates/${t.id}`, { name: name.trim(), description: description.trim() });
      if (!result.ok) return { title: result.error, items: result.problems };
      onList(result.data as TemplateList);
      setMode("view");
      return null;
    });

  const remove = () => {
    if (!window.confirm(`Delete the template "${t.name}"? Events already made from it stay.`)) return;
    run(async () => {
      const result = await call("DELETE", `events/saved-templates/${t.id}`);
      if (!result.ok) return { title: result.error, items: result.problems };
      onList(result.data as TemplateList);
      return null;
    });
  };

  return (
    <li className="space-y-3 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-medium">{t.name}</p>
          <p className="text-xs text-muted">
            {t.templateLabel} · {t.scoringMode === "TEAM" ? "Teams" : "Solo players"} · runs {t.days} {t.days === 1 ? "day" : "days"} · {t.prizes} {t.prizes === 1 ? "prize" : "prizes"}
            {t.createdByName ? ` · saved by ${t.createdByName}` : ""}
          </p>
          {t.description && <p className="mt-0.5 break-words text-sm text-muted">{t.description}</p>}
          {!t.available && <p className="mt-0.5 text-xs text-amber-300">This kind of event isn&apos;t available any more, so the template can&apos;t be used.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button type="button" className="text-gold underline disabled:opacity-40" disabled={!t.available || pending} onClick={() => setMode(mode === "use" ? "view" : "use")}>
            Use
          </button>
          <button type="button" className="text-muted underline" disabled={pending} onClick={() => setMode(mode === "edit" ? "view" : "edit")}>
            Rename
          </button>
          <button type="button" className="text-red-400 underline" disabled={pending} onClick={remove}>
            Delete
          </button>
        </div>
      </div>
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {mode === "use" && (
        <div className="grid gap-3 rounded-lg border border-surface-border p-3 md:grid-cols-[1fr_14rem_auto] md:items-end">
          <FormField label="Name of the new event" hint={`At least ${MIN_NAME} characters.`}>
            <input className={inputClass} value={eventName} maxLength={80} onChange={(e) => setEventName(e.target.value)} />
          </FormField>
          <FormField label="Starts" hint="Empty: the template's usual time.">
            <input className={inputClass} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </FormField>
          <button type="button" className={primaryButton} disabled={pending || eventName.trim().length < MIN_NAME} onClick={useIt}>
            {pending ? "Creating…" : "Create event"}
          </button>
        </div>
      )}
      {mode === "edit" && (
        <div className="grid gap-3 rounded-lg border border-surface-border p-3 md:grid-cols-2">
          <FormField label="Template name" hint="Each template has its own name.">
            <input className={inputClass} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Note" hint="Optional. What it is for.">
            <input className={inputClass} value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <div className="flex gap-2 md:col-span-2">
            <button type="button" className={primaryButton} disabled={pending || name.trim().length < MIN_NAME} onClick={rename}>
              Save
            </button>
            <button type="button" className={ghostButton} disabled={pending} onClick={() => setMode("view")}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
