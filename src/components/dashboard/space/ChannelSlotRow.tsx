"use client";

import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, inputClass } from "@/components/admin/ui";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { ViewMode } from "@/components/dashboard/ui/ViewMode";
import { effectiveUse, patternOf, withPattern, withUse } from "@/lib/eventSpace";
import type { SpaceDraft, SpaceSlot } from "@/lib/eventTypes";
import { choicesOf, type GuildStructure } from "@/lib/jonnybot-admin";

/**
 * One of an event's single channels (the staff channel, announcements, general chat, the live board, the proof to review): a switch for whether the event has it
 * at all and, while it does, a second switch for who provides it. "JonnyBot makes it" is on to begin with and shows the name; off, the same place shows a picker
 * for a channel you already have. Switched off at the top, the channel is left out. It reads and writes the same draft as the rest of the Channels tab, wherever
 * it is shown.
 */
export function ChannelSlotRow({
  slot,
  draft,
  onChange,
  structure,
  disabled,
  canMake = true,
  plannedName,
  mode = "basic",
}: {
  slot: SpaceSlot;
  draft: SpaceDraft;
  onChange: (next: SpaceDraft) => void;
  structure?: GuildStructure;
  disabled?: boolean;
  /** False while the event isn't letting JonnyBot make roles and channels at all: then only an existing channel can be chosen. */
  canMake?: boolean;
  /** What JonnyBot would call it, from the plan. */
  plannedName?: string | null;
  mode?: ViewMode;
}) {
  const use = effectiveUse(slot, draft);
  const used = use.use !== "none";
  const makes = use.use === "create";
  return (
    <SettingRow
      title={slot.label}
      hint={slot.hint}
      checked={used}
      disabled={disabled}
      onChange={(on) => onChange(withUse(draft, slot.key, on ? (canMake ? "create" : "existing") : "none", null))}
      offHint="Left out: nothing is made or chosen for this."
    >
      <Toggle
        checked={makes}
        disabled={disabled || !canMake}
        label="JonnyBot makes it"
        detail={
          !canMake
            ? "Switch on “Make roles and channels for this event” first. Until then, choose a channel you already have."
            : makes
              ? "Made inside the event's category when you set up the channels."
              : "Off: pick a channel you already have. JonnyBot uses it but never changes who can see it."
        }
        onChange={(on) => onChange(withUse(draft, slot.key, on ? "create" : "existing", use.channelId))}
      />
      {makes && canMake && (
        <FormField label="Name" size="md" hint={mode === "advanced" ? `{event} is the event's name. The usual name is ${slot.defaultPattern}.` : undefined}>
          <input
            className={inputClass}
            value={patternOf(slot.key, slot.defaultPattern, draft)}
            maxLength={100}
            disabled={disabled}
            onChange={(e) => onChange(withPattern(draft, slot.key, e.target.value, slot.defaultPattern))}
          />
        </FormField>
      )}
      {!makes && structure && (
        <FormField label="Channel to use" size="lg" as="group">
          <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={use.channelId} onChange={(id) => onChange(withUse(draft, slot.key, "existing", id))} none="Choose a channel" />
        </FormField>
      )}
      {makes && canMake && plannedName && <p className="text-xs text-gold">It will be called #{plannedName}</p>}
    </SettingRow>
  );
}
