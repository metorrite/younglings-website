"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ghostButton, Notice } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { confirmDialog } from "@/components/ui/Dialogs";
import type { AbsenceAdmin, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

/** "Tue 3 Nov 2026" for a yyyy-mm-dd day (read as UTC, the day the bot counts in). */
export function absenceDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/**
 * Leave of absence (T-190): the switch, and who is away now with "End early". Members set their own notice with /absence or on their profile; staff
 * don't set one for them (it's the member's word), but can end one that is wrong or over.
 */
export function AbsenceManager({
  initial,
  attentionHref,
  save,
  end,
}: {
  initial: AbsenceAdmin;
  attentionHref: string;
  save: (enabled: boolean) => Promise<WelcomeActionResult<AbsenceAdmin>>;
  end: (userId: string) => Promise<WelcomeActionResult<AbsenceAdmin>>;
}) {
  const [saved, setSaved] = useState(initial);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [listOutcome, setListOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save(enabled);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setEnabled(result.data.enabled);
      setOutcome({ tone: "success", title: result.data.enabled ? "Saved. Members can now use /absence or their profile." : "Saved. Leave of absence is off; nobody is left out of Needs attention." });
    });
  }

  async function endEarly(userId: string, name: string) {
    setListOutcome(null);
    if (!(await confirmDialog({ title: `End ${name}'s leave now?`, body: "They'll show up on Needs attention again if they're quiet. They can set a new notice any time.", confirmLabel: "End leave" }))) return;
    start(async () => {
      const result = await end(userId);
      if (!result.ok) return setListOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setListOutcome({ tone: "success", title: `${name}'s leave is over.` });
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="absence-on"
          title="Leave of absence"
          hint="Switch it on for this server."
          defaultOpen
          summary={
            <>
              <Chip tone={enabled ? "good" : "bad"}>{enabled ? "On" : "Off"}</Chip>
              <Chip>{saved.notices.length} away now</Chip>
            </>
          }
          info={`Members use /absence set (a number of days, up to ${saved.maxDays}) or their website profile, with an optional reason only staff see. While it runs, Needs attention leaves them out of "Inactive" and "Not capped" and lists them under "Away". It ends by itself after the last day.`}
        >
          <SettingRow
            title="Use leave of absence"
            hint={enabled ? "Members can say they're away." : "Nobody can set a notice."}
            checked={enabled}
            onChange={(on) => {
              setEnabled(on);
              setOutcome(null);
            }}
            offHint="Off: /absence refuses, and Needs attention ignores any notices still saved."
          />
        </CollapsibleCard>
      </PanelGrid>

      <SaveBar pending={pending} onSave={submit} outcome={outcome} dirty={enabled !== saved.enabled} onDiscard={() => setEnabled(saved.enabled)} />

      <section className="rounded-xl border border-surface-border bg-surface p-5">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Away now</h2>
          <span className="text-sm text-muted">{saved.notices.length}</span>
        </div>
        <p className="mb-3 text-sm text-muted">
          Soonest back first. They&apos;re listed under &quot;Away&quot; on{" "}
          <Link href={attentionHref} className="text-gold hover:underline">
            Needs attention
          </Link>
          .
        </p>
        {listOutcome && <div className="mb-3"><Notice tone={listOutcome.tone} title={listOutcome.title} items={listOutcome.items} /></div>}
        {!saved.enabled ? (
          <p className="text-sm text-muted">Switch leave of absence on to see who is away.</p>
        ) : saved.notices.length === 0 ? (
          <p className="text-sm text-muted">Nobody is on leave.</p>
        ) : (
          <ul className="divide-y divide-surface-border/50">
            {saved.notices.map((n) => {
              const name = n.name ?? `Member ${n.userId}`;
              return (
                <li key={n.userId} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{name}</span>
                    <span className="text-muted"> · until {absenceDay(n.until)}</span>
                    {n.reason && <span className="block truncate text-xs text-muted">{n.reason}</span>}
                  </span>
                  <button type="button" className={ghostButton} disabled={pending} onClick={() => void endEarly(n.userId, name)}>
                    End early
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
