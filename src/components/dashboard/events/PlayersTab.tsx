"use client";

import { useState } from "react";
import { formatUtc, FormField, ghostButton, inputClass, primaryButton, StatusBadge } from "@/components/admin/ui";
import { GATES } from "@/components/dashboard/EventSetupFields";
import { ActionMenu, type ActionMenuItem } from "@/components/dashboard/ui/ActionMenu";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid } from "@/components/dashboard/ui/Layout";
import { Advanced } from "@/components/dashboard/ui/ViewMode";
import { askDialog, confirmDialog } from "@/components/ui/Dialogs";
import type { EventDetail, EventPlayer } from "@/lib/eventTypes";

type Run = (method: "GET" | "POST" | "PUT" | "DELETE", path: string, body: unknown, message: string | ((data: unknown) => string), after?: () => void) => void;

const KIND_LABEL = { HOME_CLAN: "Clan member", HOME_OTHER: "This server", PARTNER: "Other server" } as const;
const VERIFICATION_LABEL = { VERIFIED: "Verified", WAIVED: "Waived", PENDING: "Needs verification", REJECTED: "Turned down", NOT_REQUIRED: "Not required" } as const;

/**
 * Who is in the event. The roster comes first, since it is the thing people come here for: each player is one row with their status and team, the one thing
 * that most likely needs doing to them as a button (Verify, or Mark paid), and everything else (let through, turn down, refund, remove) behind a "more"
 * menu. Adding a player, the signups that were turned away and the bans are panels around it that open when needed.
 */
export function PlayersTab({
  detail,
  base,
  editable,
  pending,
  run,
  nameOf,
  onOpenTeams,
}: {
  detail: EventDetail;
  base: string;
  editable: boolean;
  pending: boolean;
  run: Run;
  nameOf: (userId: string) => string;
  onOpenTeams: () => void;
}) {
  const e = detail.event;
  const [adding, setAdding] = useState(false);
  const [addUser, setAddUser] = useState("");
  const [addKind, setAddKind] = useState("HOME_CLAN");
  const [addTeam, setAddTeam] = useState("");
  const [teamName, setTeamName] = useState("");
  const verifying = detail.verification.required;
  const inEvent = detail.participants.filter((p) => !p.waiting).length;
  const waiting = detail.participants.length - inEvent;
  const teamed = e.scoringMode === "TEAM";

  /** The things that can be done to one player, besides the one most likely: each is a menu entry. */
  function menuFor(p: EventPlayer, mainIsVerify: boolean, mainIsPaid: boolean): ActionMenuItem[] {
    const name = nameOf(p.userId);
    const items: ActionMenuItem[] = [];
    if (verifying && !p.waiting) {
      if (p.verification !== "VERIFIED" && !mainIsVerify) items.push({ label: "Verify", onSelect: () => run("PUT", `${base}/participants/${p.userId}/verification`, { state: "verified" }, `${name} is verified.`) });
      if (p.verification !== "VERIFIED" && p.verification !== "WAIVED")
        items.push({ label: "Let through without proof", onSelect: () => run("PUT", `${base}/participants/${p.userId}/verification`, { state: "waived" }, `${name} was let through without proof.`) });
      if (p.verification !== "REJECTED")
        items.push({
          label: "Turn down their proof…",
          tone: "danger",
          onSelect: async () => {
            const answers = await askDialog({ title: `Turn down ${name}'s verification?`, body: "They will see the reason, so they can fix it.", confirmLabel: "Turn down", tone: "danger", fields: [{ key: "why", type: "textarea", label: "Why", required: true, maxLength: 300 }] });
            const why = answers ? String(answers.why) : "";
            if (why.trim()) run("PUT", `${base}/participants/${p.userId}/verification`, { state: "rejected", note: why.trim() }, `${name}'s verification was turned down.`);
          },
        });
      if (p.verification !== "PENDING")
        items.push({ label: "Ask for a decision again", onSelect: () => run("PUT", `${base}/participants/${p.userId}/verification`, { state: "pending" }, `${name} is waiting for a decision again.`) });
    }
    if (detail.buyInEnabled) {
      if (p.buyIn === "DUE" && !mainIsPaid) items.push({ label: "Mark buy-in paid", onSelect: () => run("PUT", `${base}/participants/${p.userId}/buyin`, { status: "paid" }, "Buy-in marked paid.") });
      if (p.buyIn === "PAID")
        items.push({
          label: "Mark buy-in refunded…",
          onSelect: async () => {
            if (await confirmDialog({ title: "Mark this buy-in as refunded?", confirmLabel: "Mark refunded" })) run("PUT", `${base}/participants/${p.userId}/buyin`, { status: "refunded" }, "Buy-in marked refunded.");
          },
        });
    }
    items.push({
      label: "Remove from the event…",
      tone: "danger",
      onSelect: async () => {
        const answers = await askDialog({
          title: `Remove ${name} from the event?`,
          body: "They leave the roster and their team, and come off the Discord signup.",
          confirmLabel: "Remove player",
          tone: "danger",
          fields: [
            { key: "ban", type: "checkbox", label: "Also bar them from this event", hint: "They can't sign up again, in Discord or here, and staff can't add them until you lift it." },
            { key: "reason", type: "textarea", label: "Reason", placeholder: "Shown to staff, and to them if they try to come back.", required: true, maxLength: 300, showWhen: "ban" },
          ],
        });
        if (!answers) return;
        if (answers.ban === true) run("POST", `${base}/bans`, { userId: p.userId, reason: String(answers.reason) }, `${name} was removed and barred from the event.`);
        else run("DELETE", `${base}/participants/${p.userId}`, undefined, "Player removed.");
      },
    });
    return items;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Players</h3>
          <p className="text-sm text-muted">
            {inEvent} in the event{waiting > 0 ? `, ${waiting} on the waitlist` : ""}
            {e.maxParticipants ? ` (room for ${e.maxParticipants})` : ""}.
            {teamed && (
              <>
                {" "}
                Teams are built on the{" "}
                <button type="button" className="text-gold underline" onClick={onOpenTeams}>
                  Team builder
                </button>
                ; a player&apos;s team can also be changed here.
              </>
            )}
          </p>
        </div>
        <button type="button" className={adding ? ghostButton : primaryButton} aria-expanded={adding} onClick={() => setAdding(!adding)}>
          {adding ? "Close" : "+ Add a player"}
        </button>
      </div>

      {adding && (
        <div className="space-y-3 rounded-xl border border-surface-border bg-surface p-4 sm:p-5">
          <FieldGrid>
            <FormField label="Discord user ID" size="md">
              <input className={inputClass} inputMode="numeric" autoFocus value={addUser} onChange={(ev) => setAddUser(ev.target.value)} />
            </FormField>
            <FormField label="What they are" size="md">
              <select className={inputClass} value={addKind} onChange={(ev) => setAddKind(ev.target.value)}>
                <option value="HOME_CLAN">Clan member</option>
                <option value="HOME_OTHER">In this server, not the clan</option>
                <option value="PARTNER">From another server</option>
              </select>
            </FormField>
            {detail.teams.length > 0 && (
              <FormField label="Team" size="md">
                <select className={inputClass} value={addTeam} onChange={(ev) => setAddTeam(ev.target.value)}>
                  <option value="">No team</option>
                  {detail.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </FieldGrid>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={primaryButton}
              disabled={pending || !addUser.trim()}
              onClick={() => run("POST", `${base}/participants`, { userId: addUser.trim(), kind: addKind, teamId: addTeam || null }, "Player added.", () => setAddUser(""))}
            >
              Add the player
            </button>
            <p className="text-xs text-muted">Staff can add players any time, including after signups close. A full event puts them on the waitlist.</p>
          </div>
        </div>
      )}

      {verifying && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm">
          <span className="font-medium">Verification</span>
          <Chip tone="good">{detail.verification.verified} verified</Chip>
          {detail.verification.waived > 0 && <Chip>{detail.verification.waived} let through</Chip>}
          <Chip tone={detail.verification.pending > 0 ? "warn" : "plain"}>{detail.verification.pending} waiting for a decision</Chip>
          {detail.verification.rejected > 0 && <Chip tone="bad">{detail.verification.rejected} turned down</Chip>}
          <span className="text-xs text-muted">Players must pass {GATES.find((g) => g.id === detail.verification.gate)?.label.toLowerCase()}.</span>
        </div>
      )}

      {detail.participants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-6 text-center">
          <p className="font-medium">Nobody has joined yet</p>
          <p className="mt-1 text-sm text-muted">Players join from the signup in Discord, or you can add them yourself.</p>
          {!adding && (
            <button type="button" className={`${primaryButton} mt-3`} onClick={() => setAdding(true)}>
              + Add a player
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface">
          {detail.participants.map((p) => {
            const mainIsVerify = verifying && !p.waiting && (p.verification === "PENDING" || p.verification === "REJECTED");
            const mainIsPaid = !mainIsVerify && detail.buyInEnabled && p.buyIn === "DUE";
            return (
              <li key={p.userId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium break-words">{p.userName ?? `Player ${p.userId}`}</span>
                    {p.waiting && <StatusBadge tone="warn">Waiting</StatusBadge>}
                    {verifying && !p.waiting && <StatusBadge tone={p.verification === "VERIFIED" || p.verification === "WAIVED" ? "good" : "warn"}>{VERIFICATION_LABEL[p.verification]}</StatusBadge>}
                    {detail.buyInEnabled && <StatusBadge tone={p.buyIn === "PAID" ? "good" : "muted"}>{p.buyIn === "PAID" ? "Paid" : p.buyIn === "REFUNDED" ? "Refunded" : "Buy-in due"}</StatusBadge>}
                  </p>
                  <p className="text-xs text-muted" title="Players from the signup follow it: take them off the signup in Discord and they come off here too.">
                    {KIND_LABEL[p.kind]} · {p.source === "STAFF" ? "added by staff" : "on the signup"}
                    {p.verification === "REJECTED" && p.verificationNote ? ` · reason: ${p.verificationNote}` : ""}
                  </p>
                </div>
                {detail.teams.length > 0 && (
                  <select
                    className={`${inputClass} w-44!`}
                    aria-label={`Team for ${nameOf(p.userId)}`}
                    value={p.teamId ?? ""}
                    disabled={pending}
                    onChange={(ev) => run("PUT", `${base}/participants/${p.userId}`, { teamId: ev.target.value || null }, "Team changed.")}
                  >
                    <option value="">No team</option>
                    {detail.teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex items-center gap-2">
                  {mainIsVerify && (
                    <button type="button" className="rounded-md border border-gold/60 px-3 py-2 text-sm font-medium text-gold transition hover:bg-gold/10 disabled:opacity-50" disabled={pending} onClick={() => run("PUT", `${base}/participants/${p.userId}/verification`, { state: "verified" }, `${nameOf(p.userId)} is verified.`)}>
                      Verify
                    </button>
                  )}
                  {mainIsPaid && (
                    <button type="button" className="rounded-md border border-gold/60 px-3 py-2 text-sm font-medium text-gold transition hover:bg-gold/10 disabled:opacity-50" disabled={pending} onClick={() => run("PUT", `${base}/participants/${p.userId}/buyin`, { status: "paid" }, "Buy-in marked paid.")}>
                      Mark paid
                    </button>
                  )}
                  <ActionMenu label={`More for ${nameOf(p.userId)}`} disabled={pending} items={menuFor(p, mainIsVerify, mainIsPaid)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {detail.refused.length > 0 && (
        <CollapsibleCard
          id="event-players-refused"
          title="Signups that were turned away"
          hint="They were told why. To let one in anyway, add them yourself and choose what kind of player they are: that overrides the rule that turned them away."
          summary={<Chip tone="warn">{detail.refused.length}</Chip>}
        >
          <ul className="divide-y divide-surface-border text-sm">
            {detail.refused.map((r) => (
              <li key={r.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{r.userName ?? `Player ${r.userId}`}</span>
                  <span className="ml-2 text-muted">{r.reason}</span>
                </span>
                <button
                  type="button"
                  className="rounded-md border border-control-border px-3 py-1.5 text-xs text-gold transition hover:border-gold"
                  onClick={() => {
                    setAddUser(r.userId);
                    setAdding(true);
                  }}
                >
                  Add them anyway
                </button>
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      )}

      {detail.bans.length > 0 && (
        <CollapsibleCard id="event-players-bans" title="Barred from this event" hint="They can't sign up, in Discord or here, until you lift the ban." summary={<Chip tone="bad">{detail.bans.length}</Chip>}>
          <ul className="divide-y divide-surface-border/60 text-sm">
            {detail.bans.map((b) => (
              <li key={b.userId} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="font-medium">{b.userName ?? `Player ${b.userId}`}</span>
                  <span className="block text-xs text-muted">
                    {b.reason}
                    {b.bannedBy ? ` · by ${b.bannedBy}` : ""} · {formatUtc(b.at)}
                  </span>
                </span>
                <button
                  type="button"
                  className="rounded-md border border-control-border px-3 py-1.5 text-xs text-gold transition hover:border-gold disabled:opacity-50"
                  disabled={pending}
                  onClick={async () =>
                    (await confirmDialog({ title: `Let ${b.userName ?? `player ${b.userId}`} take part again?`, body: "They aren't put back on the roster: they sign up again like anyone.", confirmLabel: "Lift the ban" })) &&
                    run("DELETE", `${base}/bans/${b.userId}`, undefined, "The ban was lifted.")
                  }
                >
                  Lift the ban
                </button>
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      )}

      {!teamed && (
        <Advanced>
          <CollapsibleCard id="event-players-teams" title="Teams" hint="Solo events don't need any. Add some only to group players for your own reference.">
            <ul className="flex flex-wrap gap-2">
              {detail.teams.length === 0 && <li className="text-sm text-muted">No teams.</li>}
              {detail.teams.map((t) => (
                <li key={t.id} className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-sm">
                  {t.name}
                  {editable && (
                    <button type="button" className="text-xs text-red-400 underline" onClick={() => run("DELETE", `${base}/teams/${t.id}`, undefined, "Team removed.")}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {editable && (
              <div className="flex flex-wrap gap-2">
                <input className={`${inputClass} max-w-xs`} aria-label="New team name" placeholder="New team name" value={teamName} maxLength={40} onChange={(ev) => setTeamName(ev.target.value)} />
                <button type="button" className={ghostButton} disabled={pending || !teamName.trim()} onClick={() => run("POST", `${base}/teams`, { name: teamName }, "Team added.", () => setTeamName(""))}>
                  Add team
                </button>
              </div>
            )}
          </CollapsibleCard>
        </Advanced>
      )}
    </section>
  );
}
