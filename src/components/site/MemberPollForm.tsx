"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createMemberPollAction } from "@/app/polls/actions";

const field = "w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold disabled:opacity-50";

export const DURATIONS = [
  { hours: 0, label: "No end time" },
  { hours: 1, label: "1 hour" },
  { hours: 6, label: "6 hours" },
  { hours: 24, label: "1 day" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "1 week" },
];

/** Lets a verified member start their own poll (it's posted in the channel the admins picked, and can close itself). */
export function MemberPollForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState("");
  const [multiple, setMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [hours, setHours] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    setDone(null);
    start(async () => {
      const result = await createMemberPollAction({ title, options: options.split(/\r?\n/), multiple, anonymous, durationHours: hours || null });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setOptions("");
      setDone(`Posted in #${result.channel}.`);
      setTimeout(() => router.refresh(), 1500);
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-md border border-surface-border px-4 py-2 text-sm transition hover:border-gold/50 hover:text-gold">
        + Start a poll
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-surface-border bg-surface/90 p-5">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-gold uppercase">Start a poll</h2>
      <div className="space-y-3">
        <input className={field} placeholder="Your question" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Question" />
        <textarea className={`${field} min-h-24`} placeholder="One option per line — 2 to 6" value={options} onChange={(e) => setOptions(e.target.value)} aria-label="Options" />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} /> Allow several choices
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Anonymous
          </label>
          <select className={`${field} max-w-44`} value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Closes after">
            {DURATIONS.map((d) => (
              <option key={d.hours} value={d.hours}>
                {d.hours === 0 ? d.label : `Ends in ${d.label}`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" disabled={pending || !title.trim()} onClick={submit} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-50">
            {pending ? "Posting…" : "Post poll"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-foreground">
            Cancel
          </button>
          {error && <span role="alert" className="text-sm text-red-400">{error}</span>}
          {done && <span role="status" className="text-sm text-emerald-400">{done}</span>}
        </div>
      </div>
    </section>
  );
}
