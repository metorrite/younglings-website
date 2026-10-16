"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ghostButton, Notice, primaryButton } from "@/components/admin/ui";
import type { EventCall } from "@/components/dashboard/EventListView";
import { LiveSummary } from "@/components/dashboard/setup/LiveSummary";
import { OptionFields } from "@/components/dashboard/setup/OptionFields";
import { getPath, isShown, missingAnswers, setPath, type Answers, type EventDraft, type OptionSchema } from "@/lib/eventOptions";
import type { GuildStructure } from "@/lib/jonnybot-admin";

/**
 * The two short ways to make an event. <b>Standard</b> asks nothing: every option has its standard answer (the only exception is something with no sensible
 * default, like the boss of a boss night). <b>Quick</b> asks the few questions that matter and takes the standard answer for the rest. Both are made by the bot
 * from the same standard answers, so what the panel shows is what is made.
 */
export function QuickSetup({ guildId, stream, schema, structure, call }: { guildId: string; stream: "standard" | "quick"; schema: OptionSchema; structure: GuildStructure; call: EventCall }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(schema.standard);
  const [tried, setTried] = useState(false);
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [pending, start] = useTransition();
  const missing = useMemo(() => missingAnswers(schema, answers), [schema, answers]);

  const questions = useMemo(() => {
    if (stream === "quick") return schema.options.filter((o) => o.quick && isShown(o, answers));
    // standard: only what is required and has no standard answer
    const needed = new Set(missingAnswers(schema, schema.standard).map((m) => m.path));
    return schema.options.filter((o) => needed.has(o.path));
  }, [stream, schema, answers]);

  function create() {
    setProblem(null);
    if (missing.length > 0) {
      setTried(true);
      return;
    }
    const overrides: Record<string, unknown> = {};
    for (const opt of questions) {
      const value = getPath(answers, opt.path);
      if (value !== undefined) overrides[opt.path] = value;
    }
    start(async () => {
      const result = await call("POST", "events/setup/standard", { template: schema.template, overrides });
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      router.push(`/dashboard/${guildId}/event-manager/${(result.data as { id: string }).id}`);
    });
  }

  /** Keeps the answers so far as a guided draft and carries on there, for someone who sees they want to change more than the quick setup asks. */
  function customise() {
    setProblem(null);
    start(async () => {
      const made = await call("POST", "events/drafts", { template: schema.template, stream: "guided" });
      if (!made.ok) return setProblem({ title: made.error, items: made.problems });
      const draft = (made.data as { draft: EventDraft }).draft;
      const saved = await call("PUT", `events/drafts/${draft.id}`, { answers, step: "BASICS" });
      if (!saved.ok) return setProblem({ title: saved.error, items: saved.problems });
      router.push(`/dashboard/${guildId}/event-manager/new?draft=${draft.id}`);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-4">
        <p className="text-sm text-muted">
          {stream === "standard"
            ? questions.length === 0
              ? "Nothing to fill in: every option is set to its standard answer, shown on the right. You can change anything afterwards while the event is a draft or taking signups."
              : "Every option is set to its standard answer. One thing has no standard, so it is asked for here."
            : "Just the questions that matter. Every other option takes its standard answer, shown on the right, and can be changed afterwards."}
        </p>
        {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
        {questions.length > 0 && (
          <OptionFields options={questions} answers={answers} onChange={(path, value) => setAnswers((a) => setPath(a, path, value))} structure={structure} highlight={tried ? missing.map((m) => m.path) : []} />
        )}
        {tried && missing.length > 0 && <Notice tone="error" title="It can't be created until:" items={missing.map((m) => m.message)} />}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={primaryButton} disabled={pending} onClick={create}>
            {pending ? "Working…" : stream === "standard" ? "Create it with the standard options" : "Create event"}
          </button>
          <button type="button" className={ghostButton} disabled={pending} onClick={customise}>
            Customise every option…
          </button>
        </div>
        <p className="text-xs text-muted">Customising keeps what you have entered here and carries on in the guided setup, saved as a draft.</p>
      </div>
      <LiveSummary schema={schema} answers={answers} structure={structure} missing={missing} />
    </div>
  );
}
