"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { joinSignupAction, leaveSignupAction } from "@/app/signups/actions";
import type { SignupSheet } from "@/lib/site";
import { shortDate } from "@/lib/site";
import { ProgressBar } from "./blocks";

const field = "w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold disabled:opacity-50";

/** A signup sheet you can join or leave from the site: a name box, a one-click join, or the sheet's own form. */
export function SignupCard({ sheet, joined, loggedIn, defaultRsn }: { sheet: SignupSheet; joined: boolean; loggedIn: boolean; defaultRsn: string }) {
  const router = useRouter();
  const [rsn, setRsn] = useState(defaultRsn);
  const [answers, setAnswers] = useState<string[]>(() => sheet.fields.map(() => ""));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filled = sheet.max === null ? sheet.entries.length : Math.min(sheet.entries.length, sheet.max);
  const full = sheet.max !== null && sheet.entries.length >= sheet.max;

  function join() {
    setError(null);
    start(async () => {
      const result = await joinSignupAction(sheet.id, { rsn, fields: answers });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function leave() {
    setError(null);
    start(async () => {
      const result = await leaveSignupAction(sheet.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-surface-border bg-surface/90 p-5 sm:p-6">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{sheet.title}</h2>
          <p className="mt-1 text-xs text-muted">
            opened {shortDate(sheet.createdAt)}
            {sheet.type === "GROUP" ? " · group — joining gives you the group's role" : sheet.type === "SUBMISSION" ? " · submission form" : " · queue"}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${sheet.paused ? "bg-amber-500/15 text-amber-300" : full ? "bg-white/10 text-muted" : "bg-emerald-500/15 text-emerald-300"}`}>
          {sheet.paused ? "Paused" : full ? "Full" : "Open"}
        </span>
      </header>

      {sheet.note && <p className="mb-4 text-sm whitespace-pre-line text-muted">{sheet.note}</p>}

      {sheet.max !== null && (
        <div className="mb-5">
          <ProgressBar value={filled} max={sheet.max} />
          <p className="mt-1 text-xs text-muted">
            {filled} of {sheet.max} places filled
            {sheet.entries.length > sheet.max ? ` · ${sheet.entries.length - sheet.max} on the waiting list` : ""}
          </p>
        </div>
      )}

      {/* The action area */}
      <div className="mb-5 rounded-xl border border-surface-border/70 bg-background/40 p-4">
        {!loggedIn ? (
          <p className="text-sm text-muted">Log in with Discord (top right) to sign up.</p>
        ) : joined ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-emerald-300">✓ You&apos;re signed up.</p>
            <button type="button" disabled={pending} onClick={leave} className="rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50">
              {pending ? "Working…" : "Leave"}
            </button>
          </div>
        ) : sheet.paused ? (
          <p className="text-sm text-muted">This signup is paused right now.</p>
        ) : (
          <div className="space-y-3">
            {sheet.type === "QUEUE" && (
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted">Your RuneScape name</span>
                <input className={field} value={rsn} maxLength={50} onChange={(e) => setRsn(e.target.value)} placeholder="Enter your username / RSN" />
              </label>
            )}
            {sheet.type === "SUBMISSION" &&
              sheet.fields.map((f, i) => (
                <label key={f.label} className="block text-sm">
                  <span className="mb-1 block text-xs text-muted">
                    {f.label}
                    {f.required ? " *" : " (optional)"}
                    {f.type === "LINK" ? " — a link" : f.type === "IMAGE" ? " — a link to an image" : ""}
                  </span>
                  <input
                    className={field}
                    value={answers[i]}
                    maxLength={500}
                    placeholder={f.type === "TEXT" ? "" : "https://…"}
                    onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                  />
                </label>
              ))}
            <button
              type="button"
              disabled={pending || full}
              onClick={join}
              className="rounded-md bg-gold px-5 py-2 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Signing up…" : full ? "Full" : sheet.type === "GROUP" ? "Join the group" : "Sign up"}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>

      {sheet.entries.length === 0 ? (
        <p className="text-sm text-muted">Nobody has signed up yet — be the first.</p>
      ) : (
        <ol className="grid gap-1.5 sm:grid-cols-2">
          {sheet.entries.map((e, i) => {
            const waiting = sheet.max !== null && i >= sheet.max;
            return (
              <li key={`${e.name}-${e.position}`} className={`flex items-center gap-3 rounded-md border border-surface-border/60 px-3 py-1.5 text-sm ${waiting ? "opacity-60" : "bg-background/40"}`}>
                <span className="w-6 text-xs text-muted">{i + 1}</span>
                <span className="truncate">{e.name}</span>
                {waiting && <span className="ml-auto text-[11px] text-muted">waiting</span>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
