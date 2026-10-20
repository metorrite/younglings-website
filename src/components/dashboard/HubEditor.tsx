"use client";

import { useState, useTransition } from "react";
import { InfoBubble } from "@/components/dashboard/ui/InfoBubble";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { FormField, Notice, primaryButton } from "@/components/admin/ui";
import { ChannelSelect } from "@/components/admin/pickers";
import { ChannelListPicker, RolePicker } from "@/components/dashboard/pickers";
import { choicesOf, type GuildStructure, type HubCommandConfig, type HubCommandDraft, type HubConfig, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

const ROLE = "role:";

/**
 * One command's row: collapsed it shows whether it is on and who and where it is open to; open, switch it on or off, say who may use it and where, and, for Signups, fix its admin channel and limit where its
 * public panel can go. Each card saves on its own. Admins always keep access and are never held to the channel limit, so a card can't
 * lock them out.
 * <p>
 * Basic is the switch: on or off. Advanced adds who may use it, where it works and, for Signups, its channels. A command that already has a rule of its own
 * keeps showing it in Basic.
 */
function HubCard({
  command,
  groups,
  structure,
  maxList,
  canEditAccess,
  save,
}: {
  command: HubCommandConfig;
  groups: HubConfig["groups"];
  structure: GuildStructure;
  maxList: number;
  canEditAccess: boolean;
  save: (key: string, draft: HubCommandDraft) => Promise<WelcomeActionResult<HubCommandConfig>>;
}) {
  const [enabled, setEnabled] = useState(command.enabled);
  const [customAccess, setCustomAccess] = useState(command.customAccess);
  const [refs, setRefs] = useState(command.allowedRefs);
  const [channelIds, setChannelIds] = useState(command.channelIds);
  const [signup, setSignup] = useState(command.signup);
  const [afk, setAfk] = useState(command.afk);
  // members ticked to be taken off the away list when the card is saved
  const [clearIds, setClearIds] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  // what was last saved: a rule that is already in force stays on screen in Basic
  const [kept, setKept] = useState({ customAccess: command.customAccess, channels: command.channelIds.length, signup: command.signup, afk: command.afk });
  const customised =
    kept.customAccess || kept.channels > 0 || (kept.signup !== null && kept.signup !== undefined && (kept.signup.adminChannelId !== null || kept.signup.lockAdminChannel || kept.signup.publicChannelIds.length > 0)) ||
    (kept.afk !== undefined && (kept.afk.nicknameTag || kept.afk.ignoreChannelIds.length > 0));
  const showMore = mode === "advanced" || customised;

  const dirty = () => setOutcome(null);
  const roleIds = refs.filter((r) => r.startsWith(ROLE)).map((r) => r.slice(ROLE.length));
  const groupRefs = refs.filter((r) => !r.startsWith(ROLE));
  const toggleGroup = (ref: string) => {
    setRefs((all) => (all.includes(ref) ? all.filter((r) => r !== ref) : [...all, ref]));
    dirty();
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save(command.key, {
        enabled,
        customAccess,
        allowedRefs: refs,
        channelIds,
        signup,
        afk: afk ? { nicknameTag: afk.nicknameTag, ignoreChannelIds: afk.ignoreChannelIds, clearUserIds: clearIds } : undefined,
      });
      if (!result.ok) {
        setOutcome({ tone: "error", title: result.error, items: result.problems });
        return;
      }
      setKept({ customAccess, channels: channelIds.length, signup, afk });
      if (afk) {
        // the saved card says who is still away
        setAfk(result.data.afk ?? afk);
        setClearIds([]);
      }
      setOutcome({ tone: "success", title: "Saved." });
    });
  }

  const accessLabel = !customAccess ? "Usual access" : "Custom access";
  const placeLabel = channelIds.length === 0 ? "Anywhere" : `${channelIds.length} channel${channelIds.length === 1 ? "" : "s"}`;

  return (
    <section className="rounded-lg border border-surface-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="font-semibold">{command.title}</span>
          <code className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs text-foreground">/{command.slashName}</code>
          <span className="mt-0.5 block text-sm text-muted">{command.description}</span>
        </span>
        <span className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-medium ${enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{enabled ? "On" : "Off"}</span>
          {enabled && <span className="rounded-full bg-white/10 px-2.5 py-1 text-muted">{accessLabel}</span>}
          {enabled && <span className="rounded-full bg-white/10 px-2.5 py-1 text-muted">{placeLabel}</span>}
          <span aria-hidden="true" className="text-muted">{open ? "▴" : "▾"}</span>
        </span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-surface-border p-6">
          <Toggle
            checked={enabled}
            onChange={(on) => { setEnabled(on); dirty(); }}
            label="Turned on"
            detail={enabled ? "Members can use this command." : "Switched off for everyone in this server."}
          />
      {!enabled && <p className="text-xs text-amber-300">While this is off, nobody in the server can use /{command.slashName}, admins included.</p>}

      {showMore ? (
      <>
      <div className="border-t border-surface-border pt-4">
      <PanelGrid min="22rem" max="max-content" gap="gap-x-10 gap-y-6">
      <div className="max-w-xl space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          Who can use it
          <InfoBubble title="Who can use it">Admins can always use every command, whatever you choose here, so you can never lock yourself out.</InfoBubble>
        </p>
        <div className="space-y-2 text-sm">
          <label className="flex items-start gap-2">
            <input type="radio" name={`${command.key}-access`} disabled={!canEditAccess} checked={!customAccess} onChange={() => { setCustomAccess(false); dirty(); }} className="mt-1" />
            <span>
              Its usual rule: <span className="text-muted">{command.defaultAccess}</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name={`${command.key}-access`} disabled={!canEditAccess} checked={customAccess} onChange={() => { setCustomAccess(true); dirty(); }} className="mt-1" />
            <span>
              Admins, and only these:
            </span>
          </label>
        </div>
        {customAccess && (
          <div className="space-y-3 rounded-md border border-surface-border bg-background/40 p-4">
            <div>
              <p className="text-xs font-medium text-muted">Permission groups</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {groups.map((group) => {
                  const on = refs.includes(group.ref);
                  return (
                    <button
                      key={group.ref}
                      type="button"
                      aria-pressed={on}
                      disabled={!canEditAccess}
                      onClick={() => toggleGroup(group.ref)}
                      className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-50 ${on ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
                    >
                      {group.name}
                    </button>
                  );
                })}
                {groupRefs.filter((r) => !groups.some((g) => g.ref === r)).map((r) => (
                  <button key={r} type="button" aria-pressed disabled={!canEditAccess} onClick={() => toggleGroup(r)} className="rounded-full border border-red-500/40 px-3 py-1 text-xs text-red-300" title="This group was deleted. Click to remove it.">
                    deleted group ✕
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">Make your own groups, like Web Dev, on the Roles &amp; permissions page.</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Individual roles</p>
              <div className="mt-2">
                <RolePicker
                  roles={structure.roles}
                  value={roleIds}
                  max={maxList}
                  disabled={!canEditAccess}
                  onChange={(ids) => { setRefs([...groupRefs, ...ids.map((id) => `${ROLE}${id}`)]); dirty(); }}
                />
              </div>
            </div>
          </div>
        )}
        {!canEditAccess && <p className="text-xs text-muted">Only an Admin can change who may use a command.</p>}
      </div>

      <div className="max-w-xl space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          Where members can use it
          <InfoBubble title="Where members can use it">Leave it empty and the command works in every channel. Add channels to limit it to just those. Admins are never held to this limit.</InfoBubble>
        </p>
        <ChannelListPicker
          {...choicesOf(structure)}
          value={channelIds}
          max={maxList}
          empty="Anywhere in the server."
          onChange={(ids) => { setChannelIds(ids); dirty(); }}
        />
      </div>
      </PanelGrid>
      </div>

      {signup && (
        <div className="space-y-4 border-t border-surface-border pt-4">
          <p className="text-sm font-medium">Signup channels</p>
          <FormField label="Admin channel" hint="Where each signup's admin controls are posted.">
            <ChannelSelect
              channels={structure.channels}
              onlyPostable
              allowForums={false}
              value={signup.adminChannelId}
              none="Whichever channel the person picks"
              onChange={(id) => { setSignup({ ...signup, adminChannelId: id, lockAdminChannel: id ? signup.lockAdminChannel : false }); dirty(); }}
            />
          </FormField>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              disabled={!signup.adminChannelId}
              checked={signup.lockAdminChannel}
              onChange={(e) => { setSignup({ ...signup, lockAdminChannel: e.target.checked }); dirty(); }}
            />
            <span>
              Always use this channel
              <span className="block text-xs text-muted">Every new signup&apos;s admin controls go here, whatever channel the person picks while making it.</span>
            </span>
          </label>
          <div>
            <p className="text-sm font-medium">Where the public panel can be posted</p>
            <div className="mt-2">
              <ChannelListPicker
                channels={structure.channels}
                allowForums={false}
                value={signup.publicChannelIds}
                max={maxList}
                empty="Any channel. Add channels to limit it to those."
                onChange={(ids) => { setSignup({ ...signup, publicChannelIds: ids }); dirty(); }}
              />
            </div>
          </div>
        </div>
      )}
      {afk && (
        <div className="space-y-4 border-t border-surface-border pt-4">
          <p className="text-sm font-medium">Away status</p>
          <Toggle
            checked={afk.nicknameTag}
            onChange={(on) => { setAfk({ ...afk, nicknameTag: on }); dirty(); }}
            label="Put [AFK] in front of their nickname"
            detail="Added while someone is away and taken off when they are back. JonnyBot needs Manage Nicknames and skips anyone it can't rename, such as the server owner."
          />
          <div>
            <p className="text-sm font-medium">Channels where away status is ignored</p>
            <p className="text-xs text-muted">Speaking there doesn&apos;t bring someone back, and mentions there aren&apos;t answered.</p>
            <div className="mt-2">
              <ChannelListPicker
                channels={structure.channels}
                allowForums={false}
                value={afk.ignoreChannelIds}
                max={maxList}
                empty="No channel is ignored."
                onChange={(ids) => { setAfk({ ...afk, ignoreChannelIds: ids }); dirty(); }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Away right now</p>
            {afk.away.length === 0 ? (
              <p className="mt-1 text-xs text-muted">Nobody is away.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {afk.away.map((who) => {
                  const marked = clearIds.includes(who.userId);
                  return (
                    <li key={who.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-surface-border px-3 py-2 text-sm">
                      <span className={marked ? "text-muted line-through" : ""}>
                        <span className="font-medium">{who.name}</span>
                        {who.reason && <span className="text-muted"> — {who.reason}</span>}
                      </span>
                      <button
                        type="button"
                        aria-pressed={marked}
                        onClick={() => { setClearIds((all) => (marked ? all.filter((id) => id !== who.userId) : [...all, who.userId])); dirty(); }}
                        className="rounded-full border border-surface-border px-3 py-1 text-xs text-muted transition hover:text-foreground"
                      >
                        {marked ? "Undo" : "Clear"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {clearIds.length > 0 && <p className="mt-1 text-xs text-muted">{clearIds.length} will be taken off the list when you save.</p>}
          </div>
        </div>
      )}
      </>
      ) : (
        <MoreInAdvanced>who may use /{command.slashName} and where it works{signup ? ", and its signup channels" : ""}{afk ? ", and its nickname tag, ignored channels and away list" : ""}.</MoreInAdvanced>
      )}

      <div className="space-y-3 border-t border-surface-border pt-4">
        {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
        <button type="button" className={primaryButton} disabled={pending} onClick={submit}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
        </div>
      )}
    </section>
  );
}

/** The Commands page: a row for every command that stands on its own, opening to its settings. */
export function HubEditor({
  hub,
  structure,
  canEditAccess,
  save,
}: {
  hub: HubConfig;
  structure: GuildStructure;
  canEditAccess: boolean;
  save: (key: string, draft: HubCommandDraft) => Promise<WelcomeActionResult<HubCommandConfig>>;
}) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"all" | "on" | "off">("all");
  const needle = query.trim().toLowerCase();
  const shown = hub.commands.filter(
    (c) =>
      (show === "all" || (show === "on" ? c.enabled : !c.enabled)) &&
      (needle === "" || `${c.title} ${c.slashName} ${c.description}`.toLowerCase().includes(needle)),
  );
  const onCount = hub.commands.filter((c) => c.enabled).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search commands…"
          aria-label="Search commands"
          className="w-full max-w-sm rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
        />
        <div className="flex gap-1.5" role="group" aria-label="Show">
          {(["all", "on", "off"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={show === key}
              onClick={() => setShow(key)}
              className={`rounded-full border px-3 py-1 text-xs transition ${show === key ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
            >
              {key === "all" ? "All" : key === "on" ? "On" : "Off"}
            </button>
          ))}
        </div>
        <p className="ml-auto text-sm text-muted">
          {onCount} of {hub.commands.length} turned on
        </p>
      </div>
      <div className="space-y-3">
        {shown.map((command) => (
          <HubCard key={command.key} command={command} groups={hub.groups} structure={structure} maxList={hub.maxList} canEditAccess={canEditAccess} save={save} />
        ))}
        {shown.length === 0 && <p className="rounded-xl border border-dashed border-surface-border p-8 text-center text-sm text-muted">No commands match.</p>}
      </div>
    </div>
  );
}
