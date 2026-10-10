"use client";

import { useState, useTransition, type ReactNode } from "react";
import { FormField, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { ChannelSelect } from "@/components/admin/pickers";
import { RolePicker } from "@/components/dashboard/pickers";
import { WELCOME_VARIABLES } from "@/lib/welcomePreview";
import { choicesOf } from "@/lib/jonnybot-admin";
import type { QuickActions, WizardData } from "./types";

type Outcome = { title: string; items?: string[] } | null;

export interface QuickStepProps {
  data: WizardData;
  actions: QuickActions;
  /** Called once the step's answers are saved. */
  onSaved: () => void;
}

/** A yes/no question: the answer decides whether the follow-up questions show. */
function YesNo({ name, question, hint, value, onChange }: { name: string; question: string; hint?: ReactNode; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{question}</legend>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name={name} checked={value} onChange={() => onChange(true)} /> Yes
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name={name} checked={!value} onChange={() => onChange(false)} /> No
        </label>
      </div>
    </fieldset>
  );
}

/** Runs a step's save, shows what the bot said if it refused, and moves on when it didn't. */
function useStepSave(onSaved: () => void) {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  function run(save: () => Promise<{ ok: true } | { ok: false; error: string; problems: string[] }>) {
    setOutcome(null);
    start(async () => {
      const result = await save();
      if (result.ok) onSaved();
      else setOutcome({ title: result.error, items: result.problems });
    });
  }
  return { outcome, pending, run, clear: () => setOutcome(null) };
}

function StepFooter({ pending, outcome, label = "Save and continue", disabled = false, onClick }: { pending: boolean; outcome: Outcome; label?: string; disabled?: boolean; onClick: () => void }) {
  return (
    <div className="space-y-3">
      {outcome && <Notice tone="error" title={outcome.title} items={outcome.items} />}
      <button type="button" className={primaryButton} disabled={pending || disabled} onClick={onClick}>
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}

// ---------- admins and staff ----------

export function QuickPermissions({ data, actions, onSaved }: QuickStepProps) {
  const admin = data.permissions.groups.find((g) => g.key === "admin");
  const support = data.permissions.groups.find((g) => g.key === "support");
  const [adminRoles, setAdminRoles] = useState(admin?.roleIds ?? []);
  const [hasSupport, setHasSupport] = useState((support?.roleIds.length ?? 0) > 0);
  const [supportRoles, setSupportRoles] = useState(support?.roleIds ?? []);
  const { outcome, pending, run, clear } = useStepSave(onSaved);
  const max = data.permissions.maxRolesPerGroup;

  if (!data.isAdmin) {
    return <Notice tone="error" title="Only an Admin can choose who the admins are. Skip this step, or ask one of your admins to do it." />;
  }

  return (
    <div className="space-y-6">
      <FormField as="group" required label="Which roles are your server's admins?" hint="Anyone with one of these roles can use JonnyBot's admin tools and this dashboard. Pick as many roles as you like.">
        <RolePicker roles={data.structure.roles} value={adminRoles} max={max} disabled={false} onChange={(ids) => { setAdminRoles(ids); clear(); }} />
      </FormField>
      <YesNo
        name="has-support"
        question="Do you have staff who should review link requests, and nothing else?"
        hint="Support can approve or reject people linking their RuneScape name. They don't get the rest of the admin tools."
        value={hasSupport}
        onChange={(v) => { setHasSupport(v); clear(); }}
      />
      {hasSupport && (
        <FormField as="group" label="Which roles are Support?">
          <RolePicker roles={data.structure.roles} value={supportRoles} max={max} disabled={false} onChange={(ids) => { setSupportRoles(ids); clear(); }} />
        </FormField>
      )}
      <StepFooter
        pending={pending}
        outcome={outcome}
        disabled={adminRoles.length === 0}
        onClick={() => run(() => actions.permissions({ adminRoleIds: adminRoles, supportRoleIds: hasSupport ? supportRoles : [] }))}
      />
      {adminRoles.length === 0 && <p className="text-xs text-red-300">Choose at least one admin role to continue. JonnyBot can&apos;t be managed without one.</p>}
    </div>
  );
}

// ---------- clan and link requests ----------

export function QuickClan({ data, actions, onSaved }: QuickStepProps) {
  const [isClan, setIsClan] = useState(data.setup.clanName !== null);
  const [clanName, setClanName] = useState(data.setup.clanName ?? "");
  const [links, setLinks] = useState(data.setup.verificationReviewChannelId !== null);
  const [reviewChannel, setReviewChannel] = useState(data.setup.verificationReviewChannelId);
  const { outcome, pending, run, clear } = useStepSave(onSaved);

  return (
    <div className="space-y-6">
      <YesNo name="is-clan" question="Is this a server for a RuneScape clan?" hint="JonnyBot tracks the clan's members and announces their drops, quests and kills." value={isClan} onChange={(v) => { setIsClan(v); clear(); }} />
      {isClan && (
        <FormField label="What is the clan called?" hint="Exactly as it appears in game.">
          <input className={inputClass} value={clanName} maxLength={30} onChange={(e) => { setClanName(e.target.value); clear(); }} />
        </FormField>
      )}
      {isClan && (
        <p className="text-xs text-muted">
          To set a clan you must be an Admin (or higher) of it in game, with your RuneScape name linked to your Discord account. If that isn&apos;t done yet, run{" "}
          <code className="rounded bg-white/10 px-1">/rs</code> in the server, then come back and press save again.
        </p>
      )}
      <YesNo
        name="links"
        question="Should members be able to link their RuneScape name here?"
        hint="They ask with /rs, and your staff approve or reject from a card posted in a channel."
        value={links}
        onChange={(v) => { setLinks(v); clear(); }}
      />
      {links && (
        <FormField label="Where should link requests be posted for your staff?" hint="JonnyBot needs permission to send messages in that channel.">
          <ChannelSelect {...choicesOf(data.structure)} onlyPostable value={reviewChannel} onChange={(c) => { setReviewChannel(c); clear(); }} none="Choose a channel" />
        </FormField>
      )}
      <StepFooter
        pending={pending}
        outcome={outcome}
        disabled={(isClan && clanName.trim() === "") || (links && !reviewChannel)}
        onClick={() => run(() => actions.clan({ clanName: isClan ? clanName : "", reviewChannelId: links ? reviewChannel : null }))}
      />
    </div>
  );
}

// ---------- clan event feeds ----------

export function QuickTracking({ data, actions, onSaved }: QuickStepProps) {
  const current = data.tracking.find((g) => g.enabled && g.channels.length > 0)?.channels[0]?.channelId ?? null;
  const [announce, setAnnounce] = useState(current !== null);
  const [channel, setChannel] = useState<string | null>(current);
  const { outcome, pending, run, clear } = useStepSave(onSaved);

  return (
    <div className="space-y-6">
      {!data.setup.clanActive && (
        <Notice tone="error" title="These only announce members of your clan, and no clan is set yet. You can still choose a channel now, or skip this step." />
      )}
      <YesNo
        name="announce"
        question="Announce your clan's activity in Discord?"
        hint="What your members do in game, from their adventure logs: drops, quests, boss kills and Citadel visits. Also members joining and leaving the clan."
        value={announce}
        onChange={(v) => { setAnnounce(v); clear(); }}
      />
      {announce && (
        <FormField label="Which channel should they go in?" hint="Every kind of activity is announced there. The full setup lets you give each kind its own channels.">
          <ChannelSelect {...choicesOf(data.structure)} onlyPostable value={channel} onChange={(c) => { setChannel(c); clear(); }} none="Choose a channel" />
        </FormField>
      )}
      <StepFooter pending={pending} outcome={outcome} disabled={announce && !channel} onClick={() => run(() => actions.tracking({ channelId: announce ? channel : null }))} />
    </div>
  );
}

// ---------- welcome ----------

const DEFAULT_WELCOME = "Welcome {user} to **{server}**! You're member number {count}.";

export function QuickWelcome({ data, actions, onSaved }: QuickStepProps) {
  const existing = data.welcome;
  const already = existing.enabled && existing.channelId !== null;
  const [greet, setGreet] = useState(already);
  const [channel, setChannel] = useState<string | null>(existing.channelId);
  const [replace, setReplace] = useState(!already);
  const [text, setText] = useState(existing.messageType === "MESSAGE" && existing.content ? existing.content : DEFAULT_WELCOME);
  const { outcome, pending, run, clear } = useStepSave(onSaved);

  return (
    <div className="space-y-6">
      <YesNo name="greet" question="Greet new members when they join?" hint="JonnyBot posts a message in a channel for each new member." value={greet} onChange={(v) => { setGreet(v); clear(); }} />
      {greet && (
        <FormField label="Which channel should the greeting go in?">
          <ChannelSelect {...choicesOf(data.structure)} onlyPostable value={channel} onChange={(c) => { setChannel(c); clear(); }} none="Choose a channel" />
        </FormField>
      )}
      {greet && already && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={replace} onChange={(e) => { setReplace(e.target.checked); clear(); }} />
          <span>
            Replace the welcome message you already have with a simple line of text
            <span className="block text-xs text-muted">Leave this off to keep your current message (it may be an embed) and only change the channel.</span>
          </span>
        </label>
      )}
      {greet && replace && (
        <FormField label="What should it say?">
          <textarea className={`${inputClass} min-h-24`} value={text} maxLength={1800} onChange={(e) => { setText(e.target.value); clear(); }} />
          <details className="mt-2 text-xs text-muted">
            <summary className="cursor-pointer">Things you can put in it</summary>
            <ul className="mt-2 space-y-1">
              {WELCOME_VARIABLES.slice(0, 6).map((v) => (
                <li key={v.token}>
                  <code className="rounded bg-white/10 px-1">{v.token}</code> {v.meaning}
                </li>
              ))}
            </ul>
          </details>
        </FormField>
      )}
      <StepFooter
        pending={pending}
        outcome={outcome}
        disabled={greet && !channel}
        onClick={() => run(() => actions.welcome({ enabled: greet, channelId: greet ? channel : existing.channelId, text: greet && replace ? text : "" }))}
      />
    </div>
  );
}

// ---------- commands ----------

export function QuickCommands({ data, actions, onSaved }: QuickStepProps) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(data.hub.commands.map((c) => [c.key, c.enabled])));
  const { outcome, pending, run, clear } = useStepSave(onSaved);

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium">Which commands should members of your server have?</p>
      <div className="space-y-3">
        {data.hub.commands.map((command) => (
          <label key={command.key} className="flex items-start gap-3 rounded-md border border-surface-border bg-background/40 p-3 text-sm">
            <input type="checkbox" className="mt-1" checked={enabled[command.key] ?? true} onChange={(e) => { setEnabled({ ...enabled, [command.key]: e.target.checked }); clear(); }} />
            <span>
              <span className="font-medium">
                {command.title} <code className="ml-1 rounded bg-white/10 px-1 text-xs font-normal">/{command.slashName}</code>
              </span>
              <span className="block text-xs text-muted">{command.description}</span>
              <span className="block text-xs text-muted">Usually: {command.defaultAccess}.</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">Who can use each one, and where, is on the Hub page, or choose the full setup to go through it now.</p>
      <StepFooter pending={pending} outcome={outcome} onClick={() => run(() => actions.commands({ enabled }))} />
    </div>
  );
}
