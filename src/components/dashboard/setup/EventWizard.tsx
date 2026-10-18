"use client";

import { confirmDialog } from "@/components/ui/Dialogs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, formatUtc, ghostButton, Notice, primaryButton } from "@/components/admin/ui";
import type { EventCall } from "@/components/dashboard/EventListView";
import { LiveSummary } from "@/components/dashboard/setup/LiveSummary";
import { OptionFields } from "@/components/dashboard/setup/OptionFields";
import { useIsClient } from "@/components/dashboard/setup/useIsClient";
import { answerText, guidedSteps, missingAnswers, setPath, stepOptions, type Answers, type EventDraft, type OptionSchema } from "@/lib/eventOptions";
import type { GuildStructure } from "@/lib/jonnybot-admin";

const REVIEW = "REVIEW";
/** How long after the last change the draft is saved. */
const SAVE_DELAY_MS = 700;

type Stage = string;

/**
 * The guided setup: every option of the event, a step at a time, with the event as it will be made updating beside it. It only stops you going on when a
 * required answer is missing. What is entered is saved as a draft as it goes, so closing the page loses nothing and the draft can be picked up from the event
 * list.
 */
export function EventWizard({ guildId, initial, schema, structure, call }: { guildId: string; initial: EventDraft; schema: OptionSchema; structure: GuildStructure; call: EventCall }) {
  const router = useRouter();
  const steps = useMemo(() => guidedSteps(schema), [schema]);
  const order = useMemo<Stage[]>(() => [...steps.map((s) => s.key), REVIEW], [steps]);
  const [answers, setAnswers] = useState<Answers>(initial.answers ?? {});
  const [stage, setStage] = useState<Stage>(() => (order.includes(initial.step.toUpperCase()) ? initial.step.toUpperCase() : order[0]));
  // every change bumps `rev`; `savedRev` is the newest change the server is known to have
  const [rev, setRev] = useState(0);
  const [savedRev, setSavedRev] = useState(0);
  const [saveFailed, setSaveFailed] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [finished, setFinished] = useState(false);
  const [pending, start] = useTransition();

  const missing = useMemo(() => missingAnswers(schema, answers), [schema, answers]);
  const index = order.indexOf(stage);
  const step = steps.find((s) => s.key === stage) ?? null;
  const stageMissing = missing.filter((m) => m.step === stage);
  // you can go back anywhere, and forward as far as the first step that still lacks a required answer
  const firstBlocked = order.findIndex((key) => key !== REVIEW && missing.some((m) => m.step === key));
  const canEnter = (target: number) => firstBlocked === -1 || target <= firstBlocked;
  const channelName = (id: string) => structure.channels.find((c) => c.id === id)?.name ?? "unknown-channel";
  const local = useIsClient();

  useEffect(() => {
    if (rev === 0 || finished) return;
    const timer = setTimeout(async () => {
      const result = await call("PUT", `events/drafts/${initial.id}`, { answers, step: stage });
      if (result.ok) {
        setSavedRev((saved) => Math.max(saved, rev));
        setSaveFailed(null);
      } else setSaveFailed(result.error);
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [rev, answers, stage, finished, call, initial.id]);

  const unsaved = savedRev !== rev && !finished;
  useEffect(() => {
    if (!unsaved) return;
    const warn = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  function update(path: string, value: unknown) {
    setAnswers((a) => setPath(a, path, value));
    setRev((r) => r + 1);
  }

  function go(target: number) {
    if (target < 0 || target >= order.length) return;
    if (target > index && !canEnter(target)) {
      setTried(true);
      return;
    }
    setTried(false);
    setStage(order[target]);
    setRev((r) => r + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep(key: string) {
    const target = order.indexOf(key);
    if (target >= 0) go(target);
  }

  function saveAndExit() {
    setProblem(null);
    start(async () => {
      const result = await call("PUT", `events/drafts/${initial.id}`, { answers, step: stage });
      if (!result.ok) return setProblem({ title: `The draft couldn't be saved: ${result.error}`, items: result.problems });
      setFinished(true);
      router.push(`/dashboard/${guildId}/event-manager`);
    });
  }

  async function discard() {
    if (!(await confirmDialog({ title: "Throw this draft away?", body: "Nothing you entered is kept.", confirmLabel: "Throw away", tone: "danger" }))) return;
    setProblem(null);
    start(async () => {
      setFinished(true);
      const result = await call("DELETE", `events/drafts/${initial.id}`);
      if (!result.ok) {
        setFinished(false);
        return setProblem({ title: result.error, items: result.problems });
      }
      router.push(`/dashboard/${guildId}/event-manager`);
    });
  }

  function create() {
    setProblem(null);
    if (missing.length > 0) {
      setTried(true);
      return;
    }
    start(async () => {
      const result = await call("POST", `events/drafts/${initial.id}/create`, { answers, step: REVIEW });
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setFinished(true);
      router.push(`/dashboard/${guildId}/event-manager/${(result.data as { id: string }).id}`);
    });
  }

  const status = saveFailed ? (
    <span className="text-red-400">Not saved: {saveFailed}</span>
  ) : unsaved ? (
    <span className="text-muted">Saving…</span>
  ) : (
    <span className="text-muted">{rev === 0 ? `Draft saved ${formatUtc(initial.updatedAt)}` : "Draft saved"}</span>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-5">
        <ol className="flex flex-wrap gap-2" aria-label="Setup steps">
          {order.map((key, i) => {
            const label = key === REVIEW ? "Review" : (steps.find((s) => s.key === key)?.label ?? key);
            const current = key === stage;
            const needs = key !== REVIEW && missing.some((m) => m.step === key) && !current;
            const done = !current && !needs && i < index;
            const blocked = i > index && !canEnter(i);
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  onClick={() => go(i)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                    current ? "border-gold bg-gold/15 text-foreground" : blocked ? "border-surface-border text-muted opacity-60" : "border-surface-border text-muted hover:border-gold/60 hover:text-foreground"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex size-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                      current ? "bg-gold text-background" : needs ? "bg-amber-500/25 text-amber-300" : done ? "bg-emerald-500/25 text-emerald-300" : "bg-white/10"
                    }`}
                  >
                    {done ? "✓" : needs ? "!" : i + 1}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>

        {problem && <Notice tone="error" title={problem.title} items={problem.items} />}

        {step ? (
          <Card title={step.label} hint={step.blurb}>
            <OptionFields options={stepOptions(schema, step.key, answers)} answers={answers} onChange={update} structure={structure} highlight={tried ? stageMissing.map((m) => m.path) : []} />
            {tried && stageMissing.length > 0 && <Notice tone="error" title="Fill in what is required to go on:" items={stageMissing.map((m) => m.message)} />}
          </Card>
        ) : (
          <Card title="Review" hint="Check it over, then create the event. Everything here can still be changed afterwards while the event is a draft or taking signups.">
            <div className="space-y-5">
              {steps.map((s, i) => {
                const shown = stepOptions(schema, s.key, answers);
                return (
                  <section key={s.key} className="space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-medium">{s.label}</h3>
                      <button type="button" className="text-xs text-gold underline" onClick={() => go(i)}>
                        Change
                      </button>
                    </div>
                    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[14rem_1fr]">
                      {shown.map((o) => (
                        <div key={o.path} className="contents">
                          <dt className="text-muted">{o.label}</dt>
                          <dd className="min-w-0 break-words">{answerText(o, answers, channelName, local)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                );
              })}
            </div>
            {tried && missing.length > 0 && <Notice tone="error" title="It can't be created until:" items={missing.map((m) => m.message)} />}
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={ghostButton} disabled={index === 0 || pending} onClick={() => go(index - 1)}>
              Back
            </button>
            {stage !== REVIEW ? (
              <button type="button" className={primaryButton} disabled={pending} onClick={() => go(index + 1)}>
                {index === order.length - 2 ? "Review" : "Next"}
              </button>
            ) : (
              <button type="button" className={primaryButton} disabled={pending || missing.length > 0} onClick={create}>
                {pending ? "Creating…" : "Create event"}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {status}
            <button type="button" className={ghostButton} disabled={pending} onClick={saveAndExit}>
              Save and exit
            </button>
          </div>
        </div>

        <p className="text-xs text-muted">
          <Link href={`/dashboard/${guildId}/event-manager`} className="text-gold hover:underline">
            Back to all events
          </Link>
          {" · "}
          <button type="button" className="text-red-400 underline" disabled={pending} onClick={discard}>
            Throw this draft away
          </button>
        </p>
      </div>

      <LiveSummary schema={schema} answers={answers} structure={structure} missing={missing} onGoTo={goToStep} sticky />
    </div>
  );
}
