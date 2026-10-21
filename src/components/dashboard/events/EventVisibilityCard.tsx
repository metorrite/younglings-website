"use client";

import { useState } from "react";
import { Notice, primaryButton } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { EventSummary } from "@/lib/eventTypes";

type Scope = EventSummary["scope"];

const SCOPES: { id: Scope; label: string; detail: string }[] = [
  { id: "PRIVATE", label: "Only this server", detail: "Members of this Discord server see it and can join." },
  { id: "ALLIANCE", label: "This server and its alliances", detail: "Members of servers in an alliance with you see it on the events hub too." },
  { id: "PUBLIC", label: "Open to everyone", detail: "Listed on the events hub. Anyone can find it and join after joining this Discord." },
];

export function scopeLabel(scope: Scope): string {
  return SCOPES.find((s) => s.id === scope)?.label ?? scope;
}

/**
 * Who can see and join an event (T-216): its visibility (the stored `scope`), whether the standings show on the events hub, and a notice when JonnyBot staff
 * took it off the hub. "Open to everyone" is only offered while the events hub is switched on (`EVENTS_HUB`), unless the event already is.
 */
export function EventVisibilityCard({
  event,
  editable,
  pending,
  hubEnabled,
  onSave,
}: {
  event: EventSummary;
  editable: boolean;
  pending: boolean;
  hubEnabled: boolean;
  onSave: (scope: Scope, config: EventSummary["config"]) => void;
}) {
  const hub = event.config.hub ?? {};
  const [scope, setScope] = useState<Scope>(event.scope);
  const [publicStandings, setPublicStandings] = useState(hub.publicStandings === true);
  const choices = SCOPES.filter((s) => s.id !== "PUBLIC" || hubEnabled || event.scope === "PUBLIC");
  const changed = scope !== event.scope || publicStandings !== (hub.publicStandings === true);
  const takedown = hub.takedown;

  return (
    <CollapsibleCard
      id="event-visibility"
      title="Who can see and join"
      hint="Keep it to this server, share it with your alliances, or open it to everyone on the events hub."
      summary={
        <>
          <Chip tone={event.scope === "PRIVATE" ? "plain" : "good"}>{scopeLabel(event.scope)}</Chip>
          {takedown && <Chip tone="bad">Taken off the hub</Chip>}
        </>
      }
    >
      {takedown && (
        <Notice tone="error" title="JonnyBot staff took this event off the events hub" items={[takedown.reason ? `Reason: ${takedown.reason}` : "No reason was given.", "It stays visible in your own server."]} />
      )}
      {editable ? (
        <div className="space-y-3">
          <fieldset className="space-y-2" disabled={pending}>
            {choices.map((s) => (
              <label key={s.id} className="flex items-start gap-2 text-sm">
                <input type="radio" name="event-scope" className="mt-1" checked={scope === s.id} onChange={() => setScope(s.id)} />
                <span>
                  <span className="font-medium">{s.label}</span>
                  <span className="block text-xs text-muted">{s.detail}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {scope === "PUBLIC" && (
            <>
              <p className="text-xs text-muted">
                Open events are public. Don&apos;t post anything that breaks Discord&apos;s or Jagex&apos;s rules; JonnyBot staff may take an event off the hub. Players&apos; names are never shown on the hub.
              </p>
              <Toggle
                checked={publicStandings}
                onChange={setPublicStandings}
                disabled={pending}
                label="Show the standings on the events hub"
                detail="Only RuneScape names (or team names) are shown, and only when 'Who sees the standings' is set to everyone in the server."
              />
            </>
          )}
          <button
            type="button"
            className={primaryButton}
            disabled={pending || !changed}
            onClick={() => onSave(scope, { ...event.config, hub: { ...hub, publicStandings } })}
          >
            Save
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">
          {scopeLabel(event.scope)}. {event.scope === "PUBLIC" ? (hub.publicStandings ? "Standings are shown on the events hub." : "Standings aren't shown on the events hub.") : ""} It can only be changed before the event starts.
        </p>
      )}
    </CollapsibleCard>
  );
}
