"use client";

import { useState, useTransition } from "react";
import { FormField, inputClass } from "@/components/admin/ui";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import type { HelpExtras, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Draft = Pick<HelpExtras, "eventButton" | "eventStartHours" | "eventDays" | "relatedTickets" | "groupBosses" | "priorityTiers" | "longtimeGuestDays" | "longtimeGuestPings" | "longtimeGuestEscalationHours" | "kcRequirements">;

const shape = (d: Draft) => JSON.stringify([d.eventButton, d.eventStartHours, d.eventDays, d.relatedTickets, d.groupBosses, d.priorityTiers, d.longtimeGuestDays, d.longtimeGuestPings, d.longtimeGuestEscalationHours, d.kcRequirements]);

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
      const result = await save({ eventButton: draft.eventButton, eventStartHours: draft.eventStartHours, eventDays: draft.eventDays, relatedTickets: draft.relatedTickets, groupBosses: draft.groupBosses, priorityTiers: draft.priorityTiers, longtimeGuestDays: draft.longtimeGuestDays, longtimeGuestPings: draft.longtimeGuestPings, longtimeGuestEscalationHours: draft.longtimeGuestEscalationHours, kcRequirements: draft.kcRequirements });
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

        <CollapsibleCard
          id="help-extras-priority"
          title="Priority tiers"
          hint="Help clan members first, then longtime guests, then new guests."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.priorityTiers ? "good" : "bad"}>{draft.priorityTiers ? "On" : "Off"}</Chip>
              {draft.priorityTiers && draft.kcRequirements.trim() !== "" && <Chip tone="warn">Kill counts for new guests</Chip>}
            </>
          }
          info="With this on, a clan member's help ticket is handled by the member settings on the PvM Help page (pings on opening, escalation after their wait); a new guest's by the guest settings (no pings unless you turned them on there); and a longtime guest, someone in the server for the number of days below, has pings and an escalation wait of their own in between, so a member is helped soonest and a new guest last. The kill count rule below only ever applies to new guests, and a guest without the kills (or without tracked data) is never turned away: they just have to describe their earlier attempts."
        >
          <SettingRow
            title="Rank help tickets by who asks"
            hint={draft.priorityTiers ? "Members, then longtime guests, then new guests." : "Members and guests follow the PvM Help settings as before."}
            checked={draft.priorityTiers}
            onChange={(on) => change({ priorityTiers: on })}
            offHint="Off: nothing changes. Your numbers below are kept."
          >
            <FormField label="Longtime guest after (days in the server)" size="sm" info="1 to 3650.">
              {number(draft.longtimeGuestDays, 3650, 1, (n) => change({ longtimeGuestDays: n }), "Days before a guest counts as longtime")}
            </FormField>
            <Toggle
              checked={draft.longtimeGuestPings}
              onChange={(on) => change({ longtimeGuestPings: on })}
              label="Ping helpers for a longtime guest's ticket as it opens"
              detail={draft.longtimeGuestPings ? "The helpers who opted in for the tier are pinged." : "Nobody is pinged as it opens."}
            />
            <FormField label="Longtime guest: ping the next role up after (hours)" size="sm" info="0 means never. Up to 720.">
              {number(draft.longtimeGuestEscalationHours, 720, 0, (n) => change({ longtimeGuestEscalationHours: n }), "Hours before escalating a longtime guest's ticket")}
            </FormField>
            <FormField label="Kill counts for new guests" size="lg" info="Per Combat Achievement tier, like Master=50, Grandmaster=100; leave empty for none. Tracked kills are read from the guest's linked RuneScape name. A new guest asking for one of these tiers without that many tracked kills has to describe their earlier attempts instead.">
              <input className={inputClass} aria-label="Kill counts for new guests" value={draft.kcRequirements} maxLength={300} placeholder="Master=50, Grandmaster=100" onChange={(e) => change({ kcRequirements: e.target.value })} />
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
