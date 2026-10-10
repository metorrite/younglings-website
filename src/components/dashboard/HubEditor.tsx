"use client";

import { useState, useTransition } from "react";
import { Card, FormField, Notice, primaryButton } from "@/components/admin/ui";
import { ChannelSelect } from "@/components/admin/pickers";
import { ChannelListPicker, RolePicker } from "@/components/dashboard/pickers";
import { choicesOf, type GuildStructure, type HubCommandConfig, type HubCommandDraft, type HubConfig, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

const ROLE = "role:";

/**
 * One command's card: switch it on or off, say who may use it and where, and, for Signups, fix its admin channel and limit where its
 * public panel can go. Each card saves on its own. Admins always keep access and are never held to the channel limit, so a card can't
 * lock them out.
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
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();

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
      const result = await save(command.key, { enabled, customAccess, allowedRefs: refs, channelIds, signup });
      if (!result.ok) {
        setOutcome({ tone: "error", title: result.error, items: result.problems });
        return;
      }
      setOutcome({ tone: "success", title: "Saved." });
    });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-gold">
            {command.title} <code className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-xs font-normal text-foreground">/{command.slashName}</code>
          </h2>
          <p className="mt-1 text-sm text-muted">{command.description}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); dirty(); }} />
          Turned on
        </label>
      </div>
      {!enabled && <p className="text-xs text-amber-300">While this is off, nobody in the server can use /{command.slashName}, admins included.</p>}

      <div className="space-y-3 border-t border-surface-border pt-4">
        <p className="text-sm font-medium">Who can use it</p>
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

      <div className="space-y-2 border-t border-surface-border pt-4">
        <p className="text-sm font-medium">Where members can use it</p>
        <ChannelListPicker
          {...choicesOf(structure)}
          value={channelIds}
          max={maxList}
          empty="Anywhere in the server. Add channels to limit it to those. Admins can always use it anywhere."
          onChange={(ids) => { setChannelIds(ids); dirty(); }}
        />
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

      <div className="space-y-3 border-t border-surface-border pt-4">
        {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
        <button type="button" className={primaryButton} disabled={pending} onClick={submit}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </Card>
  );
}

/** The Hub: a card for every command that stands on its own. */
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
  return (
    <div className="space-y-6">
      {hub.commands.map((command) => (
        <HubCard key={command.key} command={command} groups={hub.groups} structure={structure} maxList={hub.maxList} canEditAccess={canEditAccess} save={save} />
      ))}
    </div>
  );
}
