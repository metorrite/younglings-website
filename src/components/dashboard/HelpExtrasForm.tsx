"use client";

import { useState, useTransition } from "react";
import { FormField, inputClass } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import type { HelpExtras, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Draft = Pick<HelpExtras, "eventButton" | "eventStartHours" | "eventDays">;

const shape = (d: Draft) => JSON.stringify([d.eventButton, d.eventStartHours, d.eventDays]);

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
      const result = await save({ eventButton: draft.eventButton, eventStartHours: draft.eventStartHours, eventDays: draft.eventDays });
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
