"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPollAction, createSignupAction, endPollAction, signupAdminAction } from "@/app/community/actions";
import { ChannelSelect } from "@/components/admin/pickers";
import type { AdminSignupSheet, ForumInfo, ForumThread, GuildStructure } from "@/lib/jonnybot-admin";

const field = "w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold disabled:opacity-50";
const primary = "rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-50";
const small = "rounded-md border border-surface-border px-2.5 py-1 text-xs text-muted transition hover:text-foreground disabled:opacity-40";
const danger = "rounded-md border border-red-500/40 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-500/10 disabled:opacity-40";

/** The little "only you can see this" frame every admin tool on a public page sits in. */
export function AdminFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-dashed border-gold/40 bg-gold/[0.04] p-5">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-gold uppercase">
        <span aria-hidden>🛡️</span> {title} <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium normal-case">only admins see this</span>
      </p>
      {children}
    </section>
  );
}

// ---------- polls ----------

export function CreatePollForm({ channels, forums, threads }: { channels: GuildStructure["channels"]; forums?: ForumInfo[]; threads?: ForumThread[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [multiple, setMultiple] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [hours, setHours] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    setDone(false);
    start(async () => {
      const result = await createPollAction({ title, options: options.split(/\r?\n/), anonymous, multiple, channelId, durationHours: hours || null });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setOptions("");
      setDone(true);
      // The new poll appears in Discord straight away; the site picks it up within a few seconds.
      setTimeout(() => router.refresh(), 1500);
    });
  }

  return (
    <AdminFrame title="Create a poll">
      <div className="space-y-3">
        <input className={field} placeholder="The question" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Question" />
        <textarea className={`${field} min-h-28`} placeholder={"One option per line — 2 to 6"} value={options} onChange={(e) => setOptions(e.target.value)} aria-label="Options" />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} /> Allow several choices
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Anonymous
          </label>
          <select className={`${field} max-w-44`} value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Closes after">
            {[[0, "No end time"], [1, "Ends in 1 hour"], [6, "Ends in 6 hours"], [24, "Ends in 1 day"], [72, "Ends in 3 days"], [168, "Ends in 1 week"]].map(([h, label]) => (
              <option key={h} value={h}>
                {label}
              </option>
            ))}
          </select>
          <div className="w-64">
            <ChannelSelect channels={channels} forums={forums} threads={threads} onlyPostable value={channelId || null} onChange={(id) => setChannelId(id ?? "")} none="Post in channel…" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" className={primary} disabled={pending || !channelId || !title.trim()} onClick={submit}>
            {pending ? "Posting…" : "Post poll"}
          </button>
          {error && <span role="alert" className="text-sm text-red-400">{error}</span>}
          {done && <span role="status" className="text-sm text-emerald-400">Posted in Discord.</span>}
        </div>
      </div>
    </AdminFrame>
  );
}

export function PollAdminBar({ pollId }: { pollId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function end() {
    if (!window.confirm("End this poll now? The result is final and the Discord message closes too.")) return;
    setError(null);
    start(async () => {
      const result = await endPollAction(pollId);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-gold/40 bg-gold/[0.04] px-3 py-2">
      <span className="text-[11px] font-semibold tracking-wider text-gold uppercase">🛡️ Admin</span>
      <button type="button" className={danger} disabled={pending} onClick={end}>
        {pending ? "Ending…" : "End poll"}
      </button>
      {error && <span role="alert" className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

// ---------- signups ----------

export function CreateSignupForm({ channels }: { channels: GuildStructure["channels"] }) {
  const router = useRouter();
  const postable = channels.filter((c) => c.canPost);
  const [type, setType] = useState<"QUEUE" | "GROUP" | "SUBMISSION">("QUEUE");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [max, setMax] = useState("");
  const [signupChannelId, setSignupChannelId] = useState("");
  const [adminChannelId, setAdminChannelId] = useState("");
  const [fields, setFields] = useState([{ label: "", type: "TEXT" as "TEXT" | "LINK" | "IMAGE", required: true }]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    setDone(false);
    start(async () => {
      const result = await createSignupAction({ type, title, note, max: max ? Number(max) : null, signupChannelId, adminChannelId, fields: type === "SUBMISSION" ? fields : [] });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setNote("");
      setDone(true);
      setTimeout(() => router.refresh(), 2000);
    });
  }

  const select = (value: string, set: (v: string) => void, label: string) => (
    <select className={field} value={value} onChange={(e) => set(e.target.value)} aria-label={label}>
      <option value="">{label}…</option>
      {postable.map((c) => (
        <option key={c.id} value={c.id}>
          #{c.name}
        </option>
      ))}
    </select>
  );

  return (
    <AdminFrame title="Create a signup">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <select className={field} value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Signup type">
            <option value="QUEUE">Queue</option>
            <option value="GROUP">Group (gives a role)</option>
            <option value="SUBMISSION">Submission form</option>
          </select>
          <input className={field} placeholder="Title" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        </div>
        {type === "QUEUE" && <textarea className={`${field} min-h-16`} placeholder="Notification message (optional)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Notification message" />}
        {type === "SUBMISSION" && (
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_8rem_auto_auto]">
                <input className={field} placeholder={`Question ${i + 1}`} maxLength={45} value={f.label} onChange={(e) => setFields((all) => all.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label={`Question ${i + 1}`} />
                <select className={field} value={f.type} onChange={(e) => setFields((all) => all.map((x, j) => (j === i ? { ...x, type: e.target.value as typeof f.type } : x)))} aria-label="Answer type">
                  <option value="TEXT">Text</option>
                  <option value="LINK">Link</option>
                  <option value="IMAGE">Image link</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={f.required} onChange={(e) => setFields((all) => all.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)))} /> Required
                </label>
                <button type="button" className={danger} disabled={fields.length === 1} onClick={() => setFields((all) => all.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className={small} disabled={fields.length >= 3} onClick={() => setFields((all) => [...all, { label: "", type: "TEXT", required: true }])}>
              + Add question
            </button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {type !== "GROUP" && <input className={field} type="number" min={1} max={500} placeholder="Limit (optional)" value={max} onChange={(e) => setMax(e.target.value)} aria-label="Limit" />}
          {select(signupChannelId, setSignupChannelId, "Signup channel")}
          {select(adminChannelId, setAdminChannelId, "Admin channel")}
        </div>
        <div className="flex items-center gap-4">
          <button type="button" className={primary} disabled={pending || !title.trim() || !signupChannelId || !adminChannelId} onClick={submit}>
            {pending ? "Creating…" : "Create signup"}
          </button>
          {error && <span role="alert" className="text-sm text-red-400">{error}</span>}
          {done && <span role="status" className="text-sm text-emerald-400">Created in Discord.</span>}
        </div>
      </div>
    </AdminFrame>
  );
}

export function SignupAdminBar({ sheet }: { sheet: AdminSignupSheet }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(action: string, confirmText?: string, userId?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    setWinner(null);
    start(async () => {
      const result = await signupAdminAction(sheet.id, action, userId);
      if (!result.ok) setError(result.error);
      else {
        if (result.data.winner) setWinner(result.data.winner);
        router.refresh();
      }
    });
  }

  const hasEntries = sheet.entries.length > 0;
  const isQueue = sheet.type === "QUEUE";

  return (
    <div className="mb-5 space-y-3 rounded-xl border border-dashed border-gold/40 bg-gold/[0.04] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-semibold tracking-wider text-gold uppercase">🛡️ Admin</span>
        <button type="button" className={small} disabled={pending} onClick={() => run("pause")}>
          {sheet.paused ? "▶ Resume" : "⏸ Pause"}
        </button>
        <button type="button" className={small} disabled={pending || !hasEntries} onClick={() => run("pick")}>
          🎲 Pick a random winner
        </button>
        {isQueue && (
          <>
            <button type="button" className={small} disabled={pending || !hasEntries} onClick={() => run("skip")}>
              ⏭ Skip first
            </button>
            <button type="button" className={small} disabled={pending || !hasEntries} onClick={() => run("removefirst")}>
              ✔ Remove first
            </button>
          </>
        )}
        <button type="button" className={danger} disabled={pending || !hasEntries} onClick={() => run("clear", "Remove everyone from this signup?")}>
          Clear all
        </button>
        <button type="button" className={danger} disabled={pending} onClick={() => run("delete", "Delete this signup completely? This removes its Discord messages too.")}>
          Delete signup
        </button>
      </div>
      {winner && <p role="status" className="text-sm text-gold">🎉 Winner: <strong>{winner}</strong> (picked at random — nobody is removed)</p>}
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
      {hasEntries && (
        <details className="text-xs text-muted">
          <summary className="cursor-pointer select-none">Remove an individual entry</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {sheet.entries.map((e) => (
              <li key={e.userId} className="flex items-center justify-between gap-2 rounded border border-surface-border/60 px-2 py-1">
                <span className="truncate text-foreground">{e.name}</span>
                <button type="button" className={danger} disabled={pending} onClick={() => run("remove", `Remove ${e.name} from this signup?`, e.userId)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
