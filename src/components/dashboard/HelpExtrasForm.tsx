"use client";

import { useState, useTransition } from "react";
import { FormField, inputClass } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import type { HelpExtras, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Draft = Pick<HelpExtras, "eventButton" | "eventStartHours" | "eventDays" | "relatedTickets" | "groupBosses">;

const shape = (d: Draft) => JSON.stringify([d.eventButton, d.eventStartHours, d.eventDays, d.relatedTickets, d.groupBosses]);

/**
 * The optional extras of the help tickets, one card each, all off until switched on. The switch owns the settings of its extra, which only matter while it is on.
 */
export function HelpExtrasForm({ initial, save }: { initial: HelpExtras; save: (draft: Draft) => Promise<WelcomeActionResult<HelpExtras>> }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(saved);

  const change = (patch: Partial<HelpExtras>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save({ eventButton: draft.eventButton, eventStartHours: draft.eventStartHours, eventDays: draft.eventDays, relatedTickets: draft.relatedTickets, groupBosses: draft.groupBosses });
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setDraft(result.data);
      setOutcome({ tone: "success", title: "Saved." });
    });
  }

  const number = (value: number, max: number, min: number, onChange: (n: number) => void, label: string) => (
    <input
      type="number"
      min={min}
      max={max}
      className={inputClass}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Math.trunc(Number(e.target.value) || min))))}
    />
  );

  return (
    <div className="space-y-4">
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="help-extras-event"
          title="Make it an event"
          hint="A button on help tickets that turns the ticket into a group event."
          defaultOpen
          summary={<Chip tone={draft.eventButton ? "good" : "bad"}>{draft.eventButton ? "On" : "Off"}</Chip>}
          info="A helper on the ticket, the panel's helper and staff roles, or an admin can press it once per ticket. It makes a boss-night event for the boss the ticket asks about (named after the boss and tier, with what the member wrote in its description), opens its signups, and puts the member and the helpers who joined on the roster. Only PvM Help and CA Help tickets get the button."
        >
          <SettingRow
            title="Show Make it an event on help tickets"
            hint={draft.eventButton ? "New and refreshed help tickets show the button." : "No button is shown."}
            checked={draft.eventButton}
            onChange={(on) => change({ eventButton: on })}
            offHint="Off: no button. Your timings are kept."
          >
            <FormField label="Starts in (hours)" size="sm" info={`From the moment the button is pressed. 0 to ${draft.maxStartHours}.`}>
              {number(draft.eventStartHours, draft.maxStartHours, 0, (n) => change({ eventStartHours: n }), "Hours until the event starts")}
            </FormField>
            <FormField label="Runs for (days)" size="sm" info={`1 to ${draft.maxDays}.`}>
              {number(draft.eventDays, draft.maxDays, 1, (n) => change({ eventDays: n }), "Days the event runs")}
            </FormField>
          </SettingRow>
        </CollapsibleCard>

        <CollapsibleCard
          id="help-extras-related"
          title="Related tickets"
          hint="Offer to link or merge tickets about the same group boss."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.relatedTickets ? "good" : "bad"}>{draft.relatedTickets ? "On" : "Off"}</Chip>
              {draft.relatedTickets && <Chip>{draft.groupBosses.split(",").filter((b) => b.trim()).length} group bosses</Chip>}
            </>
          }
          info="When a help ticket names one of these bosses and another open ticket names the same one, the new ticket gets a notice for helpers and staff listing it. Link connects the two (each says where the other is); Merge, for staff and admins only, moves the member into the other ticket and closes the new one with its transcript saved."
        >
          <SettingRow
            title="Offer to link or merge related tickets"
            hint={draft.relatedTickets ? "A notice with Link and Merge buttons appears in the new ticket." : "No notice is shown."}
            checked={draft.relatedTickets}
            onChange={(on) => change({ relatedTickets: on })}
            offHint="Off: no notice. Your boss list is kept."
          >
            <FormField label="Group bosses" size="lg" info="Comma separated, matched ignoring case against the boss a ticket names. Only these bosses are matched.">
              <input className={inputClass} aria-label="Group bosses" value={draft.groupBosses} maxLength={400} onChange={(e) => change({ groupBosses: e.target.value })} />
            </FormField>
          </SettingRow>
        </CollapsibleCard>
      </PanelGrid>

      <SaveBar
        pending={pending}
        onSave={submit}
        outcome={outcome}
        dirty={dirty}
        onDiscard={() => {
          setDraft(saved);
          setOutcome(null);
        }}
      />
    </div>
  );
}
