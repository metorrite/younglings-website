"use client";

import { useState, useTransition } from "react";
import { ChannelSelect, RoleSelect } from "@/components/admin/pickers";
import { FormField, inputClass } from "@/components/admin/ui";
import { ChannelListPicker, RolePicker } from "@/components/dashboard/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { andList } from "@/components/dashboard/ui/andList";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { choicesOf, type ChatLevelSettings, type GuildStructure, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Draft = Omit<ChatLevelSettings, "members" | "limits">;

const shape = (s: Draft) => JSON.stringify(s);
const small = "rounded-full border border-surface-border px-3 py-1 text-xs text-muted transition hover:text-foreground";
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Chat levels. The switch owns XP and the wait between awards; the level-up message and the level roles are their own panels. Ignored channels and roles and the
 * multipliers are rarely used, so they are Advanced (and stay visible once something is saved there).
 */
export function ChatLevelsForm({
  initial,
  structure,
  save,
}: {
  initial: ChatLevelSettings;
  structure: GuildStructure;
  save: (draft: Draft) => Promise<WelcomeActionResult<ChatLevelSettings>>;
}) {
  const strip = (s: ChatLevelSettings): Draft => {
    const { members: _members, limits: _limits, ...rest } = s;
    void _members;
    void _limits;
    return rest;
  };
  const limits = initial.limits;
  const [saved, setSaved] = useState<Draft>(strip(initial));
  const [draft, setDraft] = useState<Draft>(strip(initial));
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const dirty = shape(draft) !== shape(saved);
  const showTuning = advanced || saved.ignoredChannels.length > 0 || saved.ignoredRoles.length > 0 || saved.channelMultipliers.length > 0 || saved.roleMultipliers.length > 0 || saved.removeOldRoles;
  const hidden = [!showTuning && "channels and roles that earn nothing, XP multipliers and replacing old level roles"].filter((x): x is string => typeof x === "string");
  const channelName = structure.channels.find((c) => c.id === draft.announceChannelId)?.name;

  const change = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save(draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(strip(result.data));
      setDraft(strip(result.data));
      setOutcome({ tone: "success", title: draft.enabled ? "Saved. Members now earn XP for chatting." : "Saved. Chat levels are switched off (XP is kept)." });
    });
  }

  const roleRows = [...draft.levelRoles].sort((a, b) => a.level - b.level);

  return (
    <div className="space-y-4">
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="levels-xp"
          title="XP for chatting"
          hint="Switch it on and set how fast people level."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.enabled ? "good" : "bad"}>{draft.enabled ? "On" : "Off"}</Chip>
              <Chip>{draft.minXp}–{draft.maxXp} XP</Chip>
              <Chip>every {draft.cooldownSeconds}s</Chip>
            </>
          }
          info="Each message earns a random amount of XP in this range, at most once per wait. Bots, webhooks and direct messages never earn. Only the fact that a message was sent counts, never what it said. Levels are separate from the clan points and never change them."
        >
          <SettingRow
            title="Run chat levels"
            hint={draft.enabled ? "Members earn XP for chatting." : "Nobody earns XP."}
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            offHint="Off: nobody earns XP and /level says it's off. Everyone's XP is kept."
          >
            <FormField label="Least XP per message" size="sm">
              <input type="number" className={inputClass} min={1} max={limits.maxXp} value={draft.minXp} onChange={(e) => change({ minXp: clamp(Math.trunc(Number(e.target.value) || 1), 1, limits.maxXp) })} />
            </FormField>
            <FormField label="Most XP per message" size="sm">
              <input type="number" className={inputClass} min={1} max={limits.maxXp} value={draft.maxXp} onChange={(e) => change({ maxXp: clamp(Math.trunc(Number(e.target.value) || 1), 1, limits.maxXp) })} />
            </FormField>
            <FormField label="Wait between awards (seconds)" size="sm" info="A member who chats faster than this earns nothing extra.">
              <input
                type="number"
                className={inputClass}
                min={limits.minCooldown}
                max={limits.maxCooldown}
                value={draft.cooldownSeconds}
                onChange={(e) => change({ cooldownSeconds: clamp(Math.trunc(Number(e.target.value) || limits.minCooldown), limits.minCooldown, limits.maxCooldown) })}
              />
            </FormField>
          </SettingRow>
        </CollapsibleCard>

        <CollapsibleCard
          id="levels-announce"
          title="Level-up message"
          hint="Say so when someone reaches a new level."
          summary={<Chip tone={draft.announce ? "good" : "plain"}>{draft.announce ? (channelName ? `In #${channelName}` : "Where they chat") : "No message"}</Chip>}
          info="Off by default. {user} mentions the member, {level} is their new level and {server} is the server's name."
        >
          <SettingRow title="Announce level-ups" checked={draft.announce} onChange={(on) => change({ announce: on })} offHint="Off: levelling up is silent.">
            <FormField label="Channel" size="md" as="group" info="Leave on 'Where they chat' to answer in the channel the member was chatting in.">
              <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={draft.announceChannelId} onChange={(id) => change({ announceChannelId: id })} none="Where they chat" />
            </FormField>
            <FormField label="Message" size="lg" hint={`${draft.announceMessage.length}/${limits.maxMessage}. Variables: {user} {level} {server}`}>
              <input className={inputClass} maxLength={limits.maxMessage} value={draft.announceMessage} onChange={(e) => change({ announceMessage: e.target.value })} />
            </FormField>
            <p className="max-w-xl rounded bg-[#313338] p-3 text-sm text-[#dbdee1]">{draft.announceMessage.replace("{user}", "@PvmRyan").replace("{level}", "7").replace("{server}", "Younglings")}</p>
          </SettingRow>
        </CollapsibleCard>

        <CollapsibleCard
          id="levels-roles"
          title="Level roles"
          hint="A role handed out at a level."
          summary={<Chip>{draft.levelRoles.length} role{draft.levelRoles.length === 1 ? "" : "s"}</Chip>}
          info="A member who reaches the level gets the role (and every lower level's role too, unless you choose to replace them in Advanced). Only ordinary roles below JonnyBot's own with no powerful permissions can be handed out; the save tells you if one can't."
        >
          <div className="space-y-2">
            {roleRows.length === 0 && <p className="text-xs text-muted">No level roles yet.</p>}
            {roleRows.map((row) => (
              <div key={row.level + ":" + row.roleId} className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted">Level</span>
                  <input
                    type="number"
                    className={`${inputClass} w-20`}
                    aria-label="Level"
                    min={1}
                    max={limits.maxLevel}
                    value={row.level}
                    onChange={(e) =>
                      change({ levelRoles: draft.levelRoles.map((r) => (r === row ? { ...r, level: clamp(Math.trunc(Number(e.target.value) || 1), 1, limits.maxLevel) } : r)) })
                    }
                  />
                </label>
                <span className="min-w-48 flex-1">
                  <RoleSelect label="Role at this level" roles={structure.roles} value={row.roleId || null} onChange={(id) => change({ levelRoles: draft.levelRoles.map((r) => (r === row ? { ...r, roleId: id ?? "" } : r)) })} none="Choose a role…" />
                </span>
                <button type="button" className={small} onClick={() => change({ levelRoles: draft.levelRoles.filter((r) => r !== row) })}>
                  Remove
                </button>
              </div>
            ))}
            {draft.levelRoles.length < limits.maxRoles && (
              <button type="button" className={small} onClick={() => change({ levelRoles: [...draft.levelRoles, { level: (roleRows.at(-1)?.level ?? 0) + 5, roleId: "" }] })}>
                Add a level role
              </button>
            )}
          </div>
        </CollapsibleCard>

        {showTuning && (
          <CollapsibleCard
            id="levels-tuning"
            title="Who earns, and how much"
            hint="Channels and roles that earn nothing, and XP multipliers."
            summary={
              <>
                <Chip>{draft.ignoredChannels.length + draft.ignoredRoles.length} left out</Chip>
                <Chip>{draft.channelMultipliers.length + draft.roleMultipliers.length} multipliers</Chip>
              </>
            }
            info="A thread counts as its channel. A multiplier of 2 doubles the XP, 0 earns nothing. A member's best role multiplier applies, together with the channel's."
          >
            <FormField label="Channels that earn nothing" as="group" size="lg">
              <ChannelListPicker channels={structure.channels} allowForums={false} value={draft.ignoredChannels} max={limits.maxList} empty="Every channel earns XP." onChange={(ids) => change({ ignoredChannels: ids })} />
            </FormField>
            <FormField label="Roles that earn nothing" as="group" size="lg">
              <RolePicker roles={structure.roles} value={draft.ignoredRoles} max={limits.maxList} disabled={false} onChange={(ids) => change({ ignoredRoles: ids })} />
            </FormField>
            <FormField label="Channel multipliers" as="group" size="lg">
              <div className="space-y-2">
                {draft.channelMultipliers.map((row, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-48 flex-1">
                      <ChannelSelect
                        {...choicesOf(structure)}
                        allowForums={false}
                        value={row.channelId || null}
                        onChange={(id) => change({ channelMultipliers: draft.channelMultipliers.map((r, j) => (j === i ? { ...r, channelId: id ?? "" } : r)) })}
                        none="Choose a channel…"
                      />
                    </span>
                    <input
                      type="number"
                      step={0.25}
                      min={0}
                      max={limits.maxMultiplier}
                      className={`${inputClass} w-24`}
                      aria-label="XP multiplier for this channel"
                      value={row.multiplier}
                      onChange={(e) => change({ channelMultipliers: draft.channelMultipliers.map((r, j) => (j === i ? { ...r, multiplier: clamp(Number(e.target.value) || 0, 0, limits.maxMultiplier) } : r)) })}
                    />
                    <button type="button" className={small} onClick={() => change({ channelMultipliers: draft.channelMultipliers.filter((_, j) => j !== i) })}>
                      Remove
                    </button>
                  </div>
                ))}
                {draft.channelMultipliers.length < limits.maxList && (
                  <button type="button" className={small} onClick={() => change({ channelMultipliers: [...draft.channelMultipliers, { channelId: "", multiplier: 2 }] })}>
                    Add a channel multiplier
                  </button>
                )}
              </div>
            </FormField>
            <FormField label="Role multipliers" as="group" size="lg">
              <div className="space-y-2">
                {draft.roleMultipliers.map((row, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-48 flex-1">
                      <RoleSelect
                        label="Role with a multiplier"
                        roles={structure.roles}
                        value={row.roleId || null}
                        onChange={(id) => change({ roleMultipliers: draft.roleMultipliers.map((r, j) => (j === i ? { ...r, roleId: id ?? "" } : r)) })}
                        none="Choose a role…"
                      />
                    </span>
                    <input
                      type="number"
                      step={0.25}
                      min={0}
                      max={limits.maxMultiplier}
                      className={`${inputClass} w-24`}
                      aria-label="XP multiplier for this role"
                      value={row.multiplier}
                      onChange={(e) => change({ roleMultipliers: draft.roleMultipliers.map((r, j) => (j === i ? { ...r, multiplier: clamp(Number(e.target.value) || 0, 0, limits.maxMultiplier) } : r)) })}
                    />
                    <button type="button" className={small} onClick={() => change({ roleMultipliers: draft.roleMultipliers.filter((_, j) => j !== i) })}>
                      Remove
                    </button>
                  </div>
                ))}
                {draft.roleMultipliers.length < limits.maxList && (
                  <button type="button" className={small} onClick={() => change({ roleMultipliers: [...draft.roleMultipliers, { roleId: "", multiplier: 1.5 }] })}>
                    Add a role multiplier
                  </button>
                )}
              </div>
            </FormField>
            <Toggle
              checked={draft.removeOldRoles}
              onChange={(on) => change({ removeOldRoles: on })}
              label="Replace the old level role"
              detail={draft.removeOldRoles ? "A new level role takes the place of the one before it." : "Members keep every level role they have earned."}
            />
          </CollapsibleCard>
        )}
      </PanelGrid>

      {hidden.length > 0 && <MoreInAdvanced>{andList(hidden)}.</MoreInAdvanced>}

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
