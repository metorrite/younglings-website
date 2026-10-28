"use client";

/* eslint-disable @next/next/no-img-element -- a screenshot a player sent, shown at a small fixed size; next/image would need every Discord host configured */

import { useState } from "react";
import { dangerButton, FormField, inputClass, primaryButton, StatusBadge } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import type { EventClaims, EventDetail } from "@/lib/eventTypes";

type Run = (method: "GET" | "POST" | "PUT" | "DELETE", path: string, body: unknown, message: string | ((data: unknown) => string), after?: () => void) => void;

const num = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(/[, ]/g, "")));

/** A proof link is only drawn as a picture when it is an image on Discord's own servers; any other link stays a link. */
function previewable(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const discord = u.protocol === "https:" && (u.hostname === "cdn.discordapp.com" || u.hostname === "media.discordapp.net");
    return discord && /\.(png|jpe?g|gif|webp)$/i.test(u.pathname) ? url : null;
  } catch {
    return null;
  }
}

/**
 * The running event: proof waiting for a decision comes first, since it is what players are waiting on, with the screenshot beside the buttons so it can be judged
 * without opening a link; recording progress by hand is a folded panel for the occasional correction; what was decided lately is another.
 */
export function ProgressTab({
  detail,
  claims,
  base,
  pending,
  run,
  nameOf,
}: {
  detail: EventDetail;
  claims: EventClaims;
  base: string;
  pending: boolean;
  run: Run;
  nameOf: (userId: string) => string;
}) {
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [pUser, setPUser] = useState("");
  const [pObjective, setPObjective] = useState("");
  const [pAmount, setPAmount] = useState("1");
  const [pNote, setPNote] = useState("");
  const active = detail.participants.filter((p) => !p.waiting);
  const label = (key: string) => detail.objectives.find((o) => o.key === key)?.label ?? key;

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
          Proof waiting for review
          {claims.pending.length > 0 && <StatusBadge tone="warn">{claims.pending.length}</StatusBadge>}
        </h2>
        {claims.pending.length === 0 && <p className="text-sm text-muted">Nothing is waiting. Proof players send with /submit shows up here as soon as it arrives.</p>}
      </div>

      {claims.pending.length > 0 && (
        <PanelGrid min="24rem">
          {claims.pending.map((c) => {
            const picture = previewable(c.proofUrl);
            const note = decisions[c.id] ?? "";
            return (
              <div key={c.id} className="space-y-3 rounded-xl border border-surface-border bg-surface p-4 text-sm">
                <p>
                  <span className="font-medium">{c.userName ?? nameOf(c.userId)}</span>
                  {c.kind === "VERIFICATION" ? (
                    <> sent proof for <span className="font-medium">verification</span></>
                  ) : (
                    <>
                      {" "}
                      on <span className="font-medium">{label(c.objective)}</span> (×{c.amount})
                    </>
                  )}
                </p>
                {c.note && <p className="break-words text-muted">{c.note}</p>}
                {picture && (
                  <a href={picture} target="_blank" rel="noreferrer noopener" className="block">
                    <img src={picture} alt={`Proof from ${c.userName ?? nameOf(c.userId)}`} loading="lazy" className="max-h-56 w-auto max-w-full rounded-md border border-surface-border object-contain" />
                  </a>
                )}
                {c.proofUrl && /^https?:\/\//i.test(c.proofUrl) && (
                  <a href={c.proofUrl} target="_blank" rel="noreferrer noopener" className="inline-block text-gold underline">
                    {picture ? "Open the full picture" : "View proof"}
                  </a>
                )}
                <FormField label="Note for the player" hint="Needed to deny, so they know what to fix." size="lg">
                  <input className={inputClass} value={note} maxLength={300} onChange={(ev) => setDecisions({ ...decisions, [c.id]: ev.target.value })} />
                </FormField>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={primaryButton} disabled={pending} onClick={() => run("POST", `${base}/claims/${c.id}/approve`, { note }, "Approved and counted.")}>
                    Approve
                  </button>
                  <button
                    type="button"
                    className={dangerButton}
                    disabled={pending || !note.trim()}
                    title={note.trim() ? undefined : "Write a note for the player first"}
                    onClick={() => run("POST", `${base}/claims/${c.id}/deny`, { note }, "Denied.")}
                  >
                    Deny
                  </button>
                </div>
              </div>
            );
          })}
        </PanelGrid>
      )}

      <PanelGrid min="26rem">
        <CollapsibleCard
          id="event-progress-record"
          title="Record progress by hand"
          hint={detail.event.status === "RUNNING" ? "For a correction, or something the bot can't see." : "Progress counts while the event is running."}
        >
          <FieldGrid>
            <FormField label="Player" size="md">
              <select className={inputClass} value={pUser} onChange={(ev) => setPUser(ev.target.value)}>
                <option value="">Choose a player</option>
                {active.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.userName ?? p.userId}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Objective" size="md">
              <select className={inputClass} value={pObjective} onChange={(ev) => setPObjective(ev.target.value)}>
                <option value="">Choose an objective</option>
                {detail.objectives.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Amount" size="sm" hint="Negative takes progress back.">
              <input className={inputClass} inputMode="numeric" value={pAmount} onChange={(ev) => setPAmount(ev.target.value)} />
            </FormField>
            <FormField label="Note (optional)" size="md">
              <input className={inputClass} value={pNote} maxLength={300} onChange={(ev) => setPNote(ev.target.value)} />
            </FormField>
          </FieldGrid>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={primaryButton}
              disabled={pending || !pUser || !pObjective}
              onClick={() => run("POST", `${base}/progress`, { userId: pUser, objective: pObjective, amount: num(pAmount) || 1, note: pNote }, "Progress recorded.", () => setPNote(""))}
            >
              Record it
            </button>
            <p className="text-xs text-muted">Objectives that need others finished first stay locked until then.</p>
          </div>
        </CollapsibleCard>

        {claims.decided.length > 0 && (
          <CollapsibleCard id="event-progress-decided" title="Recently decided" hint="The latest proof you approved or denied." summary={<Chip>{claims.decided.length}</Chip>}>
            <ul className="divide-y divide-surface-border text-sm">
              {claims.decided.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {c.userName ?? nameOf(c.userId)} · {c.kind === "VERIFICATION" ? "Verification" : label(c.objective)}
                  </span>
                  <StatusBadge tone={c.status === "APPROVED" ? "good" : "warn"}>{c.status === "APPROVED" ? "Approved" : "Denied"}</StatusBadge>
                </li>
              ))}
            </ul>
          </CollapsibleCard>
        )}
      </PanelGrid>
    </section>
  );
}
