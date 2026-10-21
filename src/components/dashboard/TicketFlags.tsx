"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Card, dangerButton, FormField, formatUtc, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import type { TicketFlag, TicketFlagList, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

export interface TicketFlagActions {
  setEnabled: (enabled: boolean) => Promise<WelcomeActionResult<TicketFlagList>>;
  add: (ticketId: string, note: string) => Promise<WelcomeActionResult<TicketFlagList>>;
  remove: (flagId: string) => Promise<WelcomeActionResult<{ deleted: boolean }>>;
}

function FlagRow({ flag, guildId, onRemove, busy }: { flag: TicketFlag; guildId: string; onRemove: (id: string) => void; busy: boolean }) {
  return (
    <li className="space-y-1 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{flag.playerName ?? flag.playerId}</span>
        <Link className="text-xs text-gold hover:underline" href={`/dashboard/${guildId}/tickets/history/${flag.ticketId}`}>
          Ticket #{String(flag.ticketNumber).padStart(4, "0")}
        </Link>
        <span className="text-xs text-muted">
          {formatUtc(flag.createdAt)} by {flag.flaggedByName ?? flag.flaggedBy}
        </span>
        <button type="button" className={`${dangerButton} ml-auto`} disabled={busy} onClick={() => onRemove(flag.id)}>
          Remove
        </button>
      </div>
      <p className="whitespace-pre-wrap text-muted">{flag.note}</p>
    </li>
  );
}

/** The Flags tab: the on/off switch (off by default) and every flag in the server, newest first. */
export function TicketFlagsPage({ initial, guildId, actions }: { initial: TicketFlagList; guildId: string; actions: TicketFlagActions }) {
  const [list, setList] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();

  function toggle(on: boolean) {
    setOutcome(null);
    start(async () => {
      const r = await actions.setEnabled(on);
      if (!r.ok) return setOutcome({ tone: "error", title: r.error, items: r.problems });
      setList(r.data);
    });
  }

  function remove(id: string) {
    setOutcome(null);
    start(async () => {
      const r = await actions.remove(id);
      if (!r.ok) return setOutcome({ tone: "error", title: r.error, items: r.problems });
      setList((l) => ({ ...l, flags: l.flags.filter((f) => f.id !== id) }));
    });
  }

  return (
    <div className="space-y-6">
      <Card title="Bad-experience flags" hint="Staff can leave a private note on a ticket's player when a help experience went badly. The player is never told and nothing happens automatically.">
        <SettingRow
          title="Allow flags"
          hint={list.enabled ? "Staff can flag a player from a ticket's page." : "Off: flags can't be added. Flags already saved are kept."}
          checked={list.enabled}
          onChange={toggle}
          offHint="Off by default."
        >
          {null}
        </SettingRow>
        {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
      </Card>
      <Card title="Flags">
        {list.flags.length === 0 ? (
          <p className="text-sm text-muted">No flags yet. Open a ticket from the Tickets tab to flag its player.</p>
        ) : (
          <ul className="-mx-4 divide-y divide-surface-border">
            {list.flags.map((f) => (
              <FlagRow key={f.id} flag={f} guildId={guildId} onRemove={remove} busy={pending} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** On one ticket's page: the flags on its player, and (while the feature is on) a form to add one. Shows nothing when the feature is off and there is nothing to show. */
export function TicketFlagsCard({ initial, ticketId, guildId, actions }: { initial: TicketFlagList; ticketId: string; guildId: string; actions: TicketFlagActions }) {
  const [list, setList] = useState(initial);
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();

  if (!list.enabled && list.flags.length === 0) return null;

  function add() {
    setOutcome(null);
    start(async () => {
      const r = await actions.add(ticketId, note);
      if (!r.ok) return setOutcome({ tone: "error", title: r.error, items: r.problems });
      setList(r.data);
      setNote("");
    });
  }

  function remove(id: string) {
    setOutcome(null);
    start(async () => {
      const r = await actions.remove(id);
      if (!r.ok) return setOutcome({ tone: "error", title: r.error, items: r.problems });
      setList((l) => ({ ...l, flags: l.flags.filter((f) => f.id !== id) }));
    });
  }

  return (
    <Card title="Player flags" hint="Private to staff. Every flag on the person who opened this ticket.">
      {list.flags.length > 0 && (
        <ul className="-mx-4 divide-y divide-surface-border">
          {list.flags.map((f) => (
            <FlagRow key={f.id} flag={f} guildId={guildId} onRemove={remove} busy={pending} />
          ))}
        </ul>
      )}
      {list.enabled ? (
        <>
          <FormField label="Flag this player" hint={`What went wrong, in a line or two. Up to ${list.maxNote} characters.`}>
            <textarea className={`${inputClass} min-h-20`} maxLength={list.maxNote} value={note} onChange={(e) => { setNote(e.target.value); setOutcome(null); }} />
          </FormField>
          <button type="button" className={primaryButton} disabled={pending || note.trim() === ""} onClick={add}>
            {pending ? "Working…" : "Add flag"}
          </button>
        </>
      ) : (
        <p className="text-xs text-muted">Flags are switched off, so new ones can&apos;t be added.</p>
      )}
      {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
    </Card>
  );
}
