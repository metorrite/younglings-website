"use client";

import { useState, useTransition } from "react";
import { reportHubEventAction } from "@/components/clanshub/reportHubEventAction";

/**
 * Telling JonnyBot's owner that an open event on the events hub breaks the rules (T-218). The report goes to the owner's moderation page; the event stays
 * listed until they act. Put it on the hub's event page: `<ReportHubEvent eventId={event.id} />`.
 */
export function ReportHubEvent({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<{ done: boolean; error: string | null }>({ done: false, error: null });
  const [pending, start] = useTransition();

  if (state.done) return <p className="text-sm text-muted">Thanks. It has been passed on and will be looked at.</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted underline hover:text-foreground">
        Report this event
      </button>
    );
  }
  const send = () =>
    start(async () => {
      const result = await reportHubEventAction(eventId, reason);
      setState(result.ok ? { done: true, error: null } : { done: false, error: result.error });
    });
  return (
    <div className="space-y-2">
      <label className="block text-sm" htmlFor="report-event-reason">
        What is wrong with this event?
      </label>
      <textarea
        id="report-event-reason"
        value={reason}
        maxLength={500}
        rows={3}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border border-surface-border bg-background p-2 text-sm"
        placeholder="At least 10 characters"
      />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || reason.trim().length < 10}
          onClick={send}
          className="rounded-lg border border-gold/60 px-3 py-1.5 text-sm text-gold transition hover:bg-gold/10 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send report"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}
