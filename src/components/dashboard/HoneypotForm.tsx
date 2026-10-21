"use client";

import { useState, useTransition } from "react";
import { ChannelSelect, RoleSelect } from "@/components/admin/pickers";
import { FormField, inputClass } from "@/components/admin/ui";
import { RolePicker } from "@/components/dashboard/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { choicesOf, type GuildStructure, type Honeypot, type HoneypotDraft, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

const ACTIONS = [
  { key: "TIMEOUT", label: "Time out", detail: "Mutes them for a while. Easy to undo if a real member walked in." },
  { key: "KICK", label: "Kick", detail: "Removes them. They can rejoin with an invite." },
  { key: "BAN", label: "Ban", detail: "Removes them for good. Only use it where a mistake would cost nothing." },
] as const;

const DURATIONS = [
  { minutes: 60, label: "1 hour" },
  { minutes: 24 * 60, label: "1 day" },
  { minutes: 7 * 24 * 60, label: "7 days" },
  { minutes: 28 * 24 * 60, label: "28 days" },
];

const shape = (d: HoneypotDraft) => JSON.stringify([d.enabled, d.channelId, d.roleId, d.action, d.timeoutMinutes, d.exemptRoleIds, d.deleteDays]);
const toDraft = (h: Honeypot): HoneypotDraft => ({ enabled: h.enabled, channelId: h.channelId, roleId: h.roleId, action: h.action, timeoutMinutes: h.timeoutMinutes, exemptRoleIds: h.exemptRoleIds, deleteDays: h.deleteDays });

/**
 * The honeypot: switch it on, choose a decoy channel and/or role, choose what happens. It is off until switched on, and the action starts as a timeout, the one that
 * can be undone. Staff, bots, the server owner and the exempt roles are never touched. Everything on one page: there is nothing a server could skip.
 */
export function HoneypotForm({ initial, structure, save }: { initial: Honeypot; structure: GuildStructure; save: (draft: HoneypotDraft) => Promise<WelcomeActionResult<Honeypot>> }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<HoneypotDraft>(toDraft(initial));
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(toDraft(saved));
  const change = (patch: Partial<HoneypotDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };
  const can = draft.action === "BAN" ? saved.canBan : draft.action === "KICK" ? saved.canKick : saved.canTimeout;
  const missing = draft.enabled && !draft.channelId && !draft.roleId;

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save(draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setDraft(toDraft(result.data));
      setOutcome({ tone: "success", title: result.data.enabled ? "Saved. The honeypot is on." : "Saved. The honeypot is off." });
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="honeypot-trap"
          title="The trap"
          hint="Switch it on and choose what the decoy is."
          defaultOpen
          summary={<><Chip tone={saved.enabled ? "good" : "bad"}>{saved.enabled ? "On" : "Off"}</Chip>{saved.channelId && <Chip>#{structure.channels.find((c) => c.id === saved.channelId)?.name ?? "channel"}</Chip>}{saved.roleId && <Chip>@{structure.roles.find((r) => r.id === saved.roleId)?.name ?? "role"}</Chip>}</>}
          info="Make the decoy channel visible to everyone and say nothing in it, or name it something tempting. Make the decoy role something nobody can pick: never put it on a role panel, an autorole or a reward."
        >
          <SettingRow
            title="Act on whoever uses the decoy"
            hint={draft.enabled ? "Anyone who posts in the decoy channel or takes the decoy role gets the action below." : "Nothing happens to anyone."}
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            offHint="Off: the decoy is just a channel and a role. Your choices are kept."
          >
            <FormField label="Decoy channel" size="md" as="group" hint="Anyone who posts here is acted on, and their message is deleted.">
              <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={draft.channelId} onChange={(id) => change({ channelId: id })} none="No decoy channel" />
            </FormField>
            <FormField label="Decoy role" size="md" as="group" hint="Anyone who is given this role is acted on.">
              <RoleSelect roles={structure.roles.filter((r) => !r.managed)} value={draft.roleId} onChange={(id) => change({ roleId: id })} none="No decoy role" label="Decoy role" />
            </FormField>
            {missing && <p className="text-xs text-amber-300">Choose a decoy channel or a decoy role, or the honeypot can&apos;t be saved as on.</p>}
          </SettingRow>
        </CollapsibleCard>

        <CollapsibleCard
          id="honeypot-action"
          title="What happens"
          hint="The action, and who is never touched."
          defaultOpen
          summary={<Chip tone={draft.action === "TIMEOUT" ? "plain" : "warn"}>{ACTIONS.find((a) => a.key === draft.action)?.label}</Chip>}
        >
          <FormField label="Action" as="group" size="lg">
            <div className="space-y-2 text-sm">
              {ACTIONS.map((a) => (
                <label key={a.key} className="flex items-start gap-2">
                  <input type="radio" name="honeypot-action" className="mt-1" checked={draft.action === a.key} onChange={() => change({ action: a.key })} />
                  <span>
                    {a.label}
                    <span className="block text-xs text-muted">{a.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </FormField>
          {!can && <p className="mt-2 text-xs text-amber-300">JonnyBot doesn&apos;t have the Discord permission for this action in this server, so it can&apos;t carry it out until you give it.</p>}
          {draft.action === "TIMEOUT" && (
            <FormField label="Timeout length" as="group" size="lg">
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.minutes}
                    type="button"
                    aria-pressed={draft.timeoutMinutes === d.minutes}
                    onClick={() => change({ timeoutMinutes: d.minutes })}
                    className={`rounded-full border px-3 py-1 text-xs transition ${draft.timeoutMinutes === d.minutes ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </FormField>
          )}
          {draft.action === "BAN" && (
            <FormField label="Delete their messages from the last" size="sm">
              <select className={inputClass} value={draft.deleteDays} onChange={(e) => change({ deleteDays: Number(e.target.value) })}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>{n === 0 ? "Don't delete" : `${n} day${n === 1 ? "" : "s"}`}</option>
                ))}
              </select>
            </FormField>
          )}
          <div className="mt-4 space-y-2 border-t border-surface-border pt-4">
            <p className="text-sm font-medium">Never touched</p>
            <p className="text-xs text-muted">Bots, the server owner, Admins and anyone with the Administrator permission, plus holders of these roles (staff, testers):</p>
            <RolePicker roles={structure.roles} value={draft.exemptRoleIds} max={saved.maxExemptRoles} disabled={false} onChange={(ids) => change({ exemptRoleIds: ids })} />
          </div>
          <p className="mt-3 text-xs text-muted">
            Whoever is acted on is told by DM, with your appeal link if you set one on the Moderation page, and gets a numbered case there. Protected roles on that page are respected too.
          </p>
        </CollapsibleCard>
      </PanelGrid>

      <SaveBar pending={pending} onSave={submit} outcome={outcome} dirty={dirty} onDiscard={() => { setDraft(toDraft(saved)); setOutcome(null); }} />
    </div>
  );
}
