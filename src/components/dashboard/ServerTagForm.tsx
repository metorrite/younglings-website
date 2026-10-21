"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, ghostButton, inputClass } from "@/components/admin/ui";
import { RolePicker } from "@/components/dashboard/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { choicesOf, type GuildStructure, type ServerTagDraft, type ServerTagRule, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

const ACTIONS = [
  { key: "ALERT", label: "Alert only", detail: "Posts a note in your alert channel and touches nobody. Start here." },
  { key: "TIMEOUT", label: "Time out", detail: "Mutes them for a while, and posts the note." },
  { key: "KICK", label: "Kick", detail: "Removes them, and posts the note." },
  { key: "BAN", label: "Ban", detail: "Removes them for good, and posts the note." },
] as const;

const DURATIONS = [
  { minutes: 60, label: "1 hour" },
  { minutes: 24 * 60, label: "1 day" },
  { minutes: 7 * 24 * 60, label: "7 days" },
  { minutes: 28 * 24 * 60, label: "28 days" },
];

const shape = (d: ServerTagDraft) => JSON.stringify([d.enabled, d.flaggedGuildIds, d.action, d.timeoutMinutes, d.alertChannelId, d.exemptRoleIds]);
const toDraft = (r: ServerTagRule): ServerTagDraft => ({ enabled: r.enabled, flaggedGuildIds: r.flaggedGuildIds, action: r.action, timeoutMinutes: r.timeoutMinutes, alertChannelId: r.alertChannelId, exemptRoleIds: r.exemptRoleIds });

/**
 * Server-tag moderation: the flagged servers (by id), what to do when a member shows one's tag, where to be told, who is never touched. Off until switched on,
 * and the first action is alert-only. Everything is on one page because a server needs all of it to use the feature at all.
 */
export function ServerTagForm({ initial, structure, save }: { initial: ServerTagRule; structure: GuildStructure; save: (draft: ServerTagDraft) => Promise<WelcomeActionResult<ServerTagRule>> }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<ServerTagDraft>(toDraft(initial));
  const [adding, setAdding] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(toDraft(saved));
  const change = (patch: Partial<ServerTagDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };
  const can = draft.action === "BAN" ? saved.canBan : draft.action === "KICK" ? saved.canKick : draft.action === "TIMEOUT" ? saved.canTimeout : true;
  const validAdd = /^\d{15,20}$/.test(adding.trim());

  function addFlagged() {
    const value = adding.trim();
    if (!validAdd || draft.flaggedGuildIds.includes(value) || draft.flaggedGuildIds.length >= saved.maxFlagged) return;
    change({ flaggedGuildIds: [...draft.flaggedGuildIds, value] });
    setAdding("");
  }

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save(draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setDraft(toDraft(result.data));
      setOutcome({ tone: "success", title: result.data.enabled ? "Saved. Server tags are being checked." : "Saved. The check is off." });
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="servertag-flagged"
          title="Flagged servers"
          hint="Members showing the tag of one of these servers are dealt with."
          defaultOpen
          summary={<><Chip tone={saved.enabled ? "good" : "bad"}>{saved.enabled ? "On" : "Off"}</Chip><Chip>{saved.flaggedGuildIds.length} flagged</Chip></>}
          info="Add a server by its id: in Discord, turn on Developer Mode (Settings, Advanced), right-click the server's icon and choose Copy Server ID. A member's tag only counts while they have chosen to show it on their profile."
        >
          <SettingRow
            title="Check server tags"
            hint={draft.enabled ? "Members are checked when they join and when they change their profile." : "Nobody is checked."}
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            offHint="Off: nobody is checked. Your choices are kept."
          >
            <div className="space-y-2">
              {draft.flaggedGuildIds.length === 0 ? (
                <p className="text-xs text-muted">No flagged servers yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {draft.flaggedGuildIds.map((id) => (
                    <li key={id} className="flex items-center gap-1.5 rounded-full border border-surface-border px-2.5 py-1 text-xs">
                      <code>{id}</code>
                      <button type="button" aria-label={`Stop flagging ${id}`} className="text-muted hover:text-foreground" onClick={() => change({ flaggedGuildIds: draft.flaggedGuildIds.filter((x) => x !== id) })}>
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <FormField label="Add a server id" size="md" hint="15 to 20 digits">
                  <input className={inputClass} inputMode="numeric" value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFlagged(); } }} placeholder="123456789012345678" />
                </FormField>
                <button type="button" className={ghostButton} disabled={!validAdd || draft.flaggedGuildIds.length >= saved.maxFlagged} onClick={addFlagged}>Add</button>
              </div>
            </div>
          </SettingRow>
        </CollapsibleCard>

        <CollapsibleCard
          id="servertag-action"
          title="What happens"
          hint="The action, where you are told, and who is never touched."
          defaultOpen
          summary={<Chip tone={draft.action === "ALERT" ? "plain" : "warn"}>{ACTIONS.find((a) => a.key === draft.action)?.label}</Chip>}
        >
          <FormField label="Action" as="group" size="lg">
            <div className="space-y-2 text-sm">
              {ACTIONS.map((a) => (
                <label key={a.key} className="flex items-start gap-2">
                  <input type="radio" name="servertag-action" className="mt-1" checked={draft.action === a.key} onChange={() => change({ action: a.key })} />
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
          <FormField label="Alert channel" size="md" as="group" hint={draft.action === "ALERT" ? "Needed for Alert only." : "Optional: a note is posted here whatever the action."}>
            <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={draft.alertChannelId} onChange={(id) => change({ alertChannelId: id })} none="No channel" />
          </FormField>
          <div className="mt-4 space-y-2 border-t border-surface-border pt-4">
            <p className="text-sm font-medium">Never touched</p>
            <p className="text-xs text-muted">Bots, the server owner, Admins and anyone with the Administrator permission, plus holders of these roles:</p>
            <RolePicker roles={structure.roles} value={draft.exemptRoleIds} max={saved.maxExemptRoles} disabled={false} onChange={(ids) => change({ exemptRoleIds: ids })} />
          </div>
          <p className="mt-3 text-xs text-muted">An action is done through the moderation system: the member is told by DM (with your appeal link, if set), protected roles are respected, and it is written as a numbered case on the Cases page.</p>
        </CollapsibleCard>
      </PanelGrid>

      <SaveBar pending={pending} onSave={submit} outcome={outcome} dirty={dirty} onDiscard={() => { setDraft(toDraft(saved)); setOutcome(null); }} />
    </div>
  );
}
