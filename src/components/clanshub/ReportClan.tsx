"use client";

import { useState } from "react";

/** A small form for telling JonnyBot's owner that a listing breaks the rules. Posts to the public API's report route. */
export function ReportClan({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function send() {
    setState("sending");
    try {
      const response = await fetch(`/api/v1/clans/${encodeURIComponent(slug)}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(body.error ?? "That didn't go through. Try again shortly.");
        return setState("error");
      }
      setState("done");
    } catch {
      setMessage("That didn't go through. Try again shortly.");
      setState("error");
    }
  }

  if (state === "done") return <p className="text-sm text-muted">Thanks. It has been passed on and will be looked at.</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted underline hover:text-foreground">
        Report this listing
      </button>
    );
  return (
    <div className="space-y-2">
      <label className="block text-sm" htmlFor="report-reason">
        What is wrong with this listing?
      </label>
      <textarea
        id="report-reason"
        value={reason}
        maxLength={500}
        rows={3}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border border-surface-border bg-background p-2 text-sm"
        placeholder="At least 10 characters"
      />
      {state === "error" && <p className="text-sm text-red-400">{message}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={state === "sending" || reason.trim().length < 10}
          onClick={send}
          className="rounded-lg border border-gold/60 px-3 py-1.5 text-sm text-gold transition hover:bg-gold/10 disabled:opacity-50"
        >
          Send report
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}
