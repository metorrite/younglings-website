"use client";

import { useState, useTransition } from "react";
import { dangerButton, FormField, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { RolePicker } from "@/components/dashboard/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { confirmDialog } from "@/components/ui/Dialogs";
import type { CustomTagDef, CustomTagList, GuildStructure, WelcomeActionResult } from "@/lib/jonnybot-admin";

export interface CustomTagActions {
  setEnabled: (enabled: boolean) => Promise<WelcomeActionResult<CustomTagList>>;
  save: (id: string | null, tag: Omit<CustomTagDef, "id" | "uses">) => Promise<WelcomeActionResult<CustomTagDef>>;
  remove: (id: string) => Promise<WelcomeActionResult<CustomTagList>>;
}

const DELIVERY: { value: CustomTagDef["delivery"]; label: string; blurb: string }[] = [
  { value: "CHANNEL", label: "In the channel", blurb: "Everyone in the channel sees the answer." },
  { value: "PRIVATE", label: "Only to them", blurb: "Only the member who asked sees it (a hidden reply)." },
  { value: "DM", label: "By direct message", blurb: "Sent to the member's direct messages." },
];
const WAITS = [
  { seconds: 0, label: "No wait" },
  { seconds: 30, label: "30 seconds" },
  { seconds: 300, label: "5 minutes" },
  { seconds: 3600, label: "1 hour" },
];
const VARIABLES = "{user} {username} {server} {channel} {args} {arg1}…{arg9}";

const blank = (): CustomTagDef => ({ id: null, name: "", content: "", embed: false, embedTitle: "", embedColor: "", delivery: "CHANNEL", allowedRoles: [], cooldownSeconds: 0, enabled: true, uses: 0 });
const body = (t: CustomTagDef): Omit<CustomTagDef, "id" | "uses"> => ({
  name: t.name,
  content: t.content,
  embed: t.embed,
  embedTitle: t.embedTitle,
  embedColor: t.embedColor,
  delivery: t.delivery,
  allowedRoles: t.allowedRoles,
  cooldownSeconds: t.cooldownSeconds,
  enabled: t.enabled,
});
const shape = (t: CustomTagDef) => JSON.stringify(body(t));
const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs transition ${on ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`;

function TagCard({
  initial,
  limits,
  structure,
  actions,
  onSaved,
  onRemoved,
  onCancel,
}: {
  initial: CustomTagDef;
  limits: CustomTagList["limits"];
  structure: GuildStructure;
  actions: CustomTagActions;
  onSaved: (t: CustomTagDef) => void;
  onRemoved: (id: string) => void;
  onCancel: () => void;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const dirty = shape(draft) !== shape(saved);
  const isNew = saved.id === null;
  const showRules = advanced || saved.delivery !== "CHANNEL" || saved.allowedRoles.length > 0 || saved.cooldownSeconds > 0;
  const showEmbed = advanced || saved.embed;

  const change = (patch: Partial<CustomTagDef>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setProblem(null);
    setOk(false);
  };

  function save() {
    setProblem(null);
    start(async () => {
      const result = await actions.save(saved.id, body(draft));
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setSaved(result.data);
      setDraft(result.data);
      setOk(true);
      onSaved(result.data);
    });
  }

  async function remove() {
    if (isNew) return onCancel();
    if (!(await confirmDialog({ title: `Delete the tag "${saved.name}"?`, confirmLabel: "Delete tag", tone: "danger" }))) return;
    start(async () => {
      const result = await actions.remove(saved.id!);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      onRemoved(saved.id!);
    });
  }

  return (
    <CollapsibleCard
      id={`tag-${saved.id ?? "new"}`}
      title={draft.name.trim() ? `/tag use ${draft.name.trim().toLowerCase()}` : "New tag"}
      hint={draft.content.trim() ? draft.content.trim().slice(0, 90) : "Write what it should say."}
      defaultOpen={isNew}
      summary={
        <>
          <Chip tone={saved.enabled ? "good" : "bad"}>{saved.enabled ? "On" : "Off"}</Chip>
          {saved.uses > 0 && <Chip>{saved.uses} use{saved.uses === 1 ? "" : "s"}</Chip>}
          {dirty && <Chip tone="warn">Unsaved</Chip>}
        </>
      }
    >
      <FormField label="Name" size="md" hint="Letters, numbers, - and _. Members type it after /tag use.">
        <input className={inputClass} value={draft.name} maxLength={limits.maxName} placeholder="rules" onChange={(e) => change({ name: e.target.value })} />
      </FormField>
      <FormField label="Says" size="lg" info={`Variables: ${VARIABLES}. {args} is whatever the member typed after the name. A tag never pings anyone.`}>
        <textarea className={`${inputClass} min-h-24`} rows={4} value={draft.content} maxLength={limits.maxContent} placeholder="Be kind, {user}. The full rules are in the rules channel." onChange={(e) => change({ content: e.target.value })} />
      </FormField>
      {showEmbed && (
        <>
          <Toggle checked={draft.embed} onChange={(on) => change({ embed: on })} label="Show it as an embed" detail={draft.embed ? "A card with a coloured edge." : "Plain text."} />
          {draft.embed && (
            <FieldGrid>
              <FormField label="Embed title" size="md">
                <input className={inputClass} value={draft.embedTitle} maxLength={limits.maxTitle} onChange={(e) => change({ embedTitle: e.target.value })} />
              </FormField>
              <FormField label="Embed colour" size="sm" hint="Like #5865f2. Empty is blurple.">
                <input className={inputClass} value={draft.embedColor} maxLength={7} placeholder="#5865f2" onChange={(e) => change({ embedColor: e.target.value })} />
              </FormField>
            </FieldGrid>
          )}
        </>
      )}
      {showRules && (
        <>
          <FormField label="Answered" as="group" size="lg">
            <div className="flex flex-wrap gap-2">
              {DELIVERY.map((d) => (
                <button key={d.value} type="button" aria-pressed={draft.delivery === d.value} title={d.blurb} onClick={() => change({ delivery: d.value })} className={chip(draft.delivery === d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">{DELIVERY.find((d) => d.value === draft.delivery)?.blurb}</p>
          </FormField>
          <FormField label="Wait before the same member can use it again" as="group" size="lg" info="Staff with Manage Server are never held up.">
            <div className="flex flex-wrap items-center gap-2">
              {WAITS.map((w) => (
                <button key={w.seconds} type="button" aria-pressed={draft.cooldownSeconds === w.seconds} onClick={() => change({ cooldownSeconds: w.seconds })} className={chip(draft.cooldownSeconds === w.seconds)}>
                  {w.label}
                </button>
              ))}
              {!WAITS.some((w) => w.seconds === draft.cooldownSeconds) && <span className={chip(true)}>{draft.cooldownSeconds} seconds</span>}
            </div>
          </FormField>
          <FormField label="Only members with these roles" as="group" size="lg" info="Leave empty to let everyone use it. Staff can always use it.">
            <RolePicker roles={structure.roles} value={draft.allowedRoles} max={limits.maxRoles} disabled={false} onChange={(ids) => change({ allowedRoles: ids })} />
          </FormField>
        </>
      )}
      <Toggle checked={draft.enabled} onChange={(on) => change({ enabled: on })} label="Active" detail={draft.enabled ? "Members can use it." : "Switched off; kept for later."} />

      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {ok && !dirty && <Notice tone="success" title="Saved." />}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButton} disabled={pending || (!isNew && !dirty)} onClick={save}>
          {pending ? "Saving…" : isNew ? "Add this tag" : "Save"}
        </button>
        <button type="button" className={dangerButton} disabled={pending} onClick={remove}>
          {isNew ? "Cancel" : "Delete"}
        </button>
      </div>
    </CollapsibleCard>
  );
}

/** Custom tags: the switch for the server, and a list of cards that open to edit, each saved on its own. */
export function CustomTagsEditor({ initial, structure, actions }: { initial: CustomTagList; structure: GuildStructure; actions: CustomTagActions }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [tags, setTags] = useState<CustomTagDef[]>(initial.tags);
  const [drafts, setDrafts] = useState<number[]>([]);
  const [next, setNext] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const full = tags.length >= initial.limits.max;

  function toggle(on: boolean) {
    setError(null);
    start(async () => {
      const result = await actions.setEnabled(on);
      if (!result.ok) return setError(result.error);
      setEnabled(result.data.enabled);
    });
  }

  return (
    <div className="space-y-4">
      <div className="max-w-xl rounded-lg border border-surface-border p-4">
        <SettingRow
          title="Run custom tags"
          hint={enabled ? "Members can use /tag." : "Nothing answers to /tag."}
          checked={enabled}
          disabled={pending}
          onChange={toggle}
          offHint="Off: /tag says it's off. Your tags are kept."
        />
        {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {tags.length} of {initial.limits.max} used. All tags share the one /tag command, so they never count against Discord&apos;s limit on slash commands.
        </p>
        <button
          type="button"
          className={primaryButton}
          disabled={full}
          onClick={() => {
            setDrafts((d) => [next, ...d]);
            setNext((n) => n + 1);
          }}
        >
          + New tag
        </button>
      </div>

      {tags.length === 0 && drafts.length === 0 && (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center">
          <p className="font-medium">No tags yet</p>
          <p className="mt-1 text-sm text-muted">Save the answers you give again and again: the rules, how to join, a boss guide.</p>
        </div>
      )}

      <MoreInAdvanced>embeds, who can use a tag, where it is answered and how long a member waits to use it again.</MoreInAdvanced>

      <PanelGrid min="26rem">
        {drafts.map((key) => (
          <TagCard
            key={`draft-${key}`}
            initial={blank()}
            limits={initial.limits}
            structure={structure}
            actions={actions}
            onSaved={(saved) => {
              setTags((all) => [...all, saved].sort((a, b) => a.name.localeCompare(b.name)));
              setDrafts((d) => d.filter((k) => k !== key));
            }}
            onRemoved={() => {}}
            onCancel={() => setDrafts((d) => d.filter((k) => k !== key))}
          />
        ))}
        {tags.map((t) => (
          <TagCard
            key={t.id}
            initial={t}
            limits={initial.limits}
            structure={structure}
            actions={actions}
            onSaved={(saved) => setTags((all) => all.map((x) => (x.id === saved.id ? saved : x)))}
            onRemoved={(id) => setTags((all) => all.filter((x) => x.id !== id))}
            onCancel={() => {}}
          />
        ))}
      </PanelGrid>
    </div>
  );
}
