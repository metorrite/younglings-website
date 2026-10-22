"use client";

import { useState, useTransition } from "react";
import { endAbsenceAction, setAbsenceAction, type ActionResult } from "@/app/profile/actions";
import type { MyAbsence } from "@/lib/member";

const field = "w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold disabled:opacity-50";
const primary = "rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-50";
const ghost = "rounded-md border border-surface-border px-4 py-2 text-sm transition hover:border-gold/50 disabled:opacity-50";

type Actions = {
  set: (until: string, reason: string) => Promise<ActionResult<MyAbsence>>;
  end: () => Promise<ActionResult<MyAbsence>>;
};
const real: Actions = { set: setAbsenceAction, end: endAbsenceAction };

function day(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/** The member's own leave of absence (T-190): away until a day, with an optional reason staff see. The same notice `/absence` sets in Discord. */
export function AbsencePanel({ initial, actions = real }: { initial: MyAbsence; actions?: Actions }) {
  const [state, setState] = useState(initial);
  const [until, setUntil] = useState(initial.notice?.until ?? "");
  const [reason, setReason] = useState(initial.notice?.reason ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(task: () => Promise<ActionResult<MyAbsence>>) {
    setError(null);
    start(async () => {
      const result = await task();
      if (!result.ok) return setError(result.error);
      setState(result.data);
      setUntil(result.data.notice?.until ?? "");
      setReason(result.data.notice?.reason ?? "");
    });
  }

  return (
    <div className="space-y-4">
      {state.notice ? (
        <p className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm">
          You&apos;re on leave until the end of <strong>{day(state.notice.until)}</strong>
          {state.notice.reason && <span className="text-muted"> · {state.notice.reason}</span>}. You won&apos;t be flagged as inactive meanwhile.
        </p>
      ) : (
        <p className="text-sm text-muted">Going away for a while? Say until when, and staff won&apos;t flag you as inactive or ask where you went.</p>
      )}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => actions.set(until, reason));
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Back after</span>
          <input type="date" className={field} required min={state.today} max={state.latest} value={until} onChange={(e) => setUntil(e.target.value)} disabled={pending} />
        </label>
        <label className="block min-w-48 flex-1 text-sm">
          <span className="mb-1 block text-muted">Reason (optional, staff see it)</span>
          <input type="text" className={field} maxLength={state.maxReason} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Holiday, exams…" disabled={pending} />
        </label>
        <button type="submit" className={primary} disabled={pending || until === ""}>
          {state.notice ? "Change" : "Set my leave"}
        </button>
        {state.notice && (
          <button type="button" className={ghost} disabled={pending} onClick={() => run(() => actions.end())}>
            I&apos;m back
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
