"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatTile } from "@/components/dashboard/overview/StatTile";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import type { EventSummary } from "@/lib/eventTypes";

const DAY = 24 * 60 * 60 * 1000;

type Attention = { key: string; event: EventSummary; text: string; tone: "bad" | "warn" };
type Upcoming = { key: string; event: EventSummary; text: string; at: number };

/** How long until `iso`, in the words a person would use ("6 hours", "2 days"). */
function until(iso: string, now: number): string | null {
  const left = new Date(iso).getTime() - now;
  if (!Number.isFinite(left) || left <= 0) return null;
  const hours = Math.round(left / (60 * 60 * 1000));
  if (hours < 1) return "under an hour";
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(left / DAY);
  return `${days} days`;
}

/**
 * The event manager's landing view, in the style of the Overview: how many events are in each stage, how many people are in them, what needs a person now
 * (proof nobody has decided, signups about to close, players waiting for a place) and what is coming up. Everything is worked out from the list the page
 * already has. Starting an event is one button that opens the panel further down, so this stays a quick look at where things stand.
 */
export function EventsDashboard({ events, base, onStart }: { events: EventSummary[]; base: string; onStart: () => void }) {
  // the time is read once after the page is up, so what the server drew and what the browser draws never disagree
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now()); // eslint-disable-line react-hooks/set-state-in-effect -- read once after hydration so the server and first paint agree
  }, []);

  const open = events.filter((e) => !e.archived && e.status !== "DONE" && e.status !== "CANCELLED");
  const running = open.filter((e) => e.status === "RUNNING" || e.status === "SCORING");
  const signups = open.filter((e) => e.status === "SIGNUPS");
  const drafts = open.filter((e) => e.status === "DRAFT");
  const players = open.reduce((sum, e) => sum + (e.players ?? 0), 0);
  const proof = open.reduce((sum, e) => sum + (e.proofWaiting ?? 0), 0);
  const withProof = open.filter((e) => (e.proofWaiting ?? 0) > 0);

  const attention: Attention[] = [];
  for (const e of withProof) {
    const n = e.proofWaiting ?? 0;
    attention.push({ key: `${e.id}-proof`, event: e, tone: "bad", text: `${n} ${n === 1 ? "proof is" : "proofs are"} waiting for a decision` });
  }
  for (const e of signups) {
    const closes = e.config.signupClosesAt;
    const left = closes && now !== null && new Date(closes).getTime() - now < 2 * DAY ? until(closes, now) : null;
    if (left) attention.push({ key: `${e.id}-closing`, event: e, tone: "warn", text: `Signups close in ${left}` });
    if ((e.waiting ?? 0) > 0) attention.push({ key: `${e.id}-waitlist`, event: e, tone: "warn", text: `${e.waiting} on the waitlist, waiting for a place` });
  }

  const upcoming: Upcoming[] = [];
  if (now !== null) {
    const add = (e: EventSummary, kind: string, iso: string | null | undefined) => {
      const left = iso ? until(iso, now) : null;
      if (iso && left) upcoming.push({ key: `${e.id}-${kind}`, event: e, text: `${kind} in ${left}`, at: new Date(iso).getTime() });
    };
    for (const e of open) {
      if (e.status === "DRAFT" || e.status === "SIGNUPS") add(e, "Starts", e.startsAt);
      if (e.status === "SIGNUPS") add(e, "Signups close", e.config.signupClosesAt);
      if (e.status === "RUNNING" || e.status === "SCORING") add(e, "Ends", e.endsAt);
    }
    upcoming.sort((a, b) => a.at - b.at);
  }

  const to = (id: string) => `${base}/${id}`;

  return (
    <section className="space-y-4" aria-label="Events at a glance">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">At a glance</h2>
        <button type="button" onClick={onStart} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110">
          New event
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Running" value={running.length} tone={running.length > 0 ? "good" : "plain"} hint={running.length === 1 ? running[0].name : running.length > 1 ? "Running or being scored" : "Nothing running"} />
        <StatTile label="Signups open" value={signups.length} tone={signups.length > 0 ? "gold" : "plain"} hint={signups.length === 0 ? "Nothing taking signups" : `${signups.reduce((s, e) => s + (e.players ?? 0), 0)} signed up so far`} />
        <StatTile label="Drafts" value={drafts.length} tone="plain" hint={drafts.length === 0 ? "Nothing half-built" : "Not opened for signups yet"} />
        <StatTile label="Players" value={players} tone="plain" hint="In events that aren't finished" />
        <StatTile
          label="Proof waiting"
          value={proof}
          tone={proof > 0 ? "bad" : "good"}
          hint={proof === 0 ? "Nothing to decide" : withProof.length === 1 ? withProof[0].name : `In ${withProof.length} events`}
          href={withProof.length === 1 ? to(withProof[0].id) : undefined}
        />
      </div>

      <PanelGrid min="24rem">
        <div className="rounded-xl border border-surface-border bg-surface p-5">
          <h3 className="font-semibold">Needs you</h3>
          {attention.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{open.length === 0 ? "No events are open. Start one when you're ready." : "Nothing is waiting for a decision. All quiet."}</p>
          ) : (
            <ul className="mt-3 divide-y divide-surface-border">
              {attention.map((a) => (
                <li key={a.key}>
                  <Link href={to(a.event.id)} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm transition hover:text-gold">
                    <span aria-hidden className={`size-2 shrink-0 rounded-full ${a.tone === "bad" ? "bg-red-400" : "bg-amber-400"}`} />
                    <span className="min-w-0 font-medium break-words">{a.event.name}</span>
                    <span className="text-muted">{a.text}</span>
                    <span aria-hidden className="ml-auto text-muted">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-5">
          <h3 className="font-semibold">Coming up</h3>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{now === null ? " " : "No start, deadline or finish is coming up."}</p>
          ) : (
            <ul className="mt-3 divide-y divide-surface-border">
              {upcoming.slice(0, 5).map((u) => (
                <li key={u.key}>
                  <Link href={to(u.event.id)} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm transition hover:text-gold">
                    <span className="min-w-0 font-medium break-words">{u.event.name}</span>
                    <span className="text-muted">{u.text}</span>
                    <span aria-hidden className="ml-auto text-muted">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PanelGrid>
    </section>
  );
}
