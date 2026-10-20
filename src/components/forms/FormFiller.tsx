"use client";

import { useState, useTransition } from "react";
import { FormField, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import type { FormQuestion } from "@/lib/jonnybot-admin";
import type { SubmitResult } from "@/lib/webForms";

/** The form a signed-in person fills in. It only collects the answers; the bot checks every rule again when they are sent. */
export function FormFiller({
  questions,
  disabledReason,
  send,
}: {
  questions: FormQuestion[];
  /** Why the form can't be sent by this person right now (already filled in, wait, not in the server), shown instead of the button. */
  disabledReason: string | null;
  send: (answers: Record<string, string>) => Promise<SubmitResult>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<SubmitResult | null>(null);
  const [pending, start] = useTransition();

  const set = (id: string, value: string) => {
    setValues((v) => ({ ...v, [id]: value }));
    setOutcome(null);
  };

  if (outcome?.ok) {
    return (
      <div role="status" className="space-y-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
        <p className="font-semibold text-emerald-300">Sent. Thank you!</p>
        <p className="text-sm text-muted">
          {outcome.ticketOpened ? "A ticket was opened for you in the Discord server. Look for it there." : "Your answers were passed on to the team."}
        </p>
        {outcome.notes.map((note) => (
          <p key={note} className="text-sm text-gold">
            {note}
          </p>
        ))}
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabledReason) return;
        setOutcome(null);
        start(async () => setOutcome(await send(values)));
      }}
    >
      {questions.map((q) => (
        <FormField key={q.id} label={q.required ? `${q.label} (required)` : q.label} size={q.kind === "PARAGRAPH" ? "lg" : "md"} as={q.kind === "CHECKBOX" || q.kind === "CHOICE" ? "group" : "label"}>
          {q.kind === "PARAGRAPH" ? (
            <textarea className={inputClass} rows={4} maxLength={q.maxLength} value={values[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} />
          ) : q.kind === "CHOICE" ? (
            <select className={inputClass} value={values[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)}>
              <option value="">Choose…</option>
              {q.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : q.kind === "CHECKBOX" ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={values[q.id] === "true"} onChange={(e) => set(q.id, e.target.checked ? "true" : "false")} />
              Yes
            </label>
          ) : (
            <input className={inputClass} maxLength={q.maxLength} value={values[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} />
          )}
        </FormField>
      ))}

      {outcome && !outcome.ok && (
        <Notice tone="error" title={outcome.error} items={outcome.problems.length > 1 ? outcome.problems : undefined} />
      )}

      {disabledReason ? (
        <p className="rounded-md border border-surface-border bg-surface p-3 text-sm text-muted">{disabledReason}</p>
      ) : (
        <button type="submit" className={primaryButton} disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </button>
      )}
    </form>
  );
}
