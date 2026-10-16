"use client";

import { FormField, inputClass } from "@/components/admin/ui";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { EventSummary, VerificationGate } from "@/lib/eventTypes";

/** What the two setup questions are set to: whether the event follows the setup steps, and whether (and by when) players must be verified. */
export interface SetupDraft {
  follow: boolean;
  verify: boolean;
  gate: VerificationGate;
  instructions: string;
}

export const GATES: { id: VerificationGate; label: string; blurb: string }[] = [
  { id: "SIGNUP", label: "When they sign up", blurb: "A player counts once approved. Until then they are on the list but not in the event." },
  { id: "TEAMS", label: "Before teams are made (usual)", blurb: "Anyone can sign up. Players who aren't verified by then are left out of the teams, unless you let them through one by one." },
  { id: "START", label: "Before the event starts", blurb: "Everyone can be in a team, but the event can't start until every player is verified, waived or removed." },
];

export function setupFromConfig(config: EventSummary["config"] | undefined): SetupDraft {
  return {
    follow: (config?.setup?.mode ?? "OFF") !== "OFF",
    verify: config?.verification?.required ?? false,
    gate: config?.verification?.gate ?? "TEAMS",
    instructions: config?.verification?.instructions ?? "",
  };
}

/** The config with the two setup keys written from the draft; nothing else in it is touched. A mode the form doesn't offer (FULL) is kept as it was. */
export function setupToConfig(config: Record<string, unknown>, draft: SetupDraft): Record<string, unknown> {
  const next: Record<string, unknown> = { ...config };
  const before = (config.setup as { mode?: string } | undefined)?.mode;
  next.setup = { mode: draft.follow ? (before && before !== "OFF" ? before : "STANDARD") : "OFF" };
  next.verification = { required: draft.verify, gate: draft.gate, instructions: draft.instructions.trim() };
  return next;
}

/** The setup steps and verification questions, for the create form and the event's own settings. */
export function EventSetupFields({ value, onChange, disabled = false }: { value: SetupDraft; onChange: (next: SetupDraft) => void; disabled?: boolean }) {
  const gate = GATES.find((g) => g.id === value.gate);
  return (
    <div className="space-y-4 rounded-lg border border-surface-border p-4">
      <Toggle
        checked={value.follow}
        onChange={(follow) => onChange({ ...value, follow })}
        disabled={disabled}
        label="Follow the setup steps"
        detail="Close signups and confirm the roster before the event can start. Off, an organiser starts it whenever they like."
      />
      <Toggle
        checked={value.verify}
        onChange={(verify) => onChange({ ...value, verify })}
        disabled={disabled}
        label="Players must be verified"
        detail="Players send proof first (for example a screenshot of what they hold) and an organiser approves it."
      />
      {value.verify && (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Must be verified by" hint={gate?.blurb}>
            <select className={inputClass} value={value.gate} disabled={disabled} onChange={(e) => onChange({ ...value, gate: e.target.value as VerificationGate })}>
              {GATES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="What players are told to send" hint="Shown to players who join. Up to 1000 characters.">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={1000}
              disabled={disabled}
              value={value.instructions}
              placeholder="A screenshot of your bank showing your loot caskets, taken today."
              onChange={(e) => onChange({ ...value, instructions: e.target.value })}
            />
          </FormField>
        </div>
      )}
    </div>
  );
}
