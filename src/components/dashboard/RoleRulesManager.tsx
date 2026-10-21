"use client";

import { useState, useTransition } from "react";
import { dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { RolePicker } from "@/components/dashboard/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid } from "@/components/dashboard/ui/Layout";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { GuildRole, RoleRule, RoleRuleList } from "@/lib/jonnybot-admin";

type Result = Promise<{ ok: true; data: RoleRuleList } | { ok: false; error: string; problems: string[] }>;

export interface RoleRuleActions {
  save: (id: string | null, rule: Omit<RoleRule, "id">) => Result;
  remove: (id: string) => Result;
}

const blank = (): Omit<RoleRule, "id"> => ({ name: "", event: "GAINS", enabled: false, when: [], add: [], remove: [] });
const shape = (r: Omit<RoleRule, "id">) => JSON.stringify([r.name, r.event, r.enabled, r.when, r.add, r.remove]);

/**
 * Connected and trigger roles. A rule says: when a member gains (or loses) all of these roles, give them these roles and take away those. The Member and
 * Guest roles of the clan role sync and the staff permission roles can never be given or taken by a rule, and a set of rules that would loop is refused
 * with the loop named. Rules only react to role changes made after they are on.
 */
export function RoleRulesManager({ initial, roles, actions }: { initial: RoleRuleList; roles: GuildRole[]; actions: RoleRuleActions }) {
  const [list, setList] = useState(initial);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButton} disabled={adding || list.rules.length >= list.max} onClick={() => setAdding(true)}>
          New rule
        </button>
        <span className="text-sm text-muted">
          {list.rules.length} of {list.max} rules
        </span>
      </div>
      {adding && <RuleCard rule={null} list={list} roles={roles} actions={actions} onList={(l) => { setList(l); setAdding(false); }} onCancel={() => setAdding(false)} />}
      {list.rules.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-surface-border p-8 text-center">
          <p className="font-medium">No rules yet</p>
          <p className="mt-1 text-sm text-muted">Example: when someone gains Raider and Verified, give them Raid chat.</p>
        </div>
      ) : (
        list.rules.map((r) => <RuleCard key={r.id} rule={r} list={list} roles={roles} actions={actions} onList={setList} />)
      )}
    </div>
  );
}

function RuleCard({ rule, list, roles, actions, onList, onCancel }: { rule: RoleRule | null; list: RoleRuleList; roles: GuildRole[]; actions: RoleRuleActions; onList: (l: RoleRuleList) => void; onCancel?: () => void }) {
  const initial = rule ? { name: rule.name, event: rule.event, enabled: rule.enabled, when: rule.when, add: rule.add, remove: rule.remove } : blank();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = rule === null || shape(draft) !== shape(saved);
  const name = (id: string) => roles.find((r) => r.id === id)?.name ?? "(deleted role)";
  const change = (patch: Partial<typeof draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  };

  const summary = (
    <>
      <Chip tone={saved.enabled ? "good" : "warn"}>{saved.enabled ? "On" : "Off"}</Chip>
      <Chip>{saved.event === "GAINS" ? "When gained" : "When lost"}: {saved.when.map(name).join(" + ") || "nothing yet"}</Chip>
      {saved.add.length > 0 && <Chip>Gives {saved.add.length}</Chip>}
      {saved.remove.length > 0 && <Chip>Takes {saved.remove.length}</Chip>}
    </>
  );

  return (
    <CollapsibleCard id={`rule-${rule?.id ?? "new"}`} title={saved.name || "New rule"} summary={rule ? summary : undefined} open={rule === null ? true : undefined}>
      <div className="space-y-5">
        <FieldGrid>
          <FormField label="Name (only you see it)">
            <input className={inputClass} value={draft.name} maxLength={60} onChange={(e) => change({ name: e.target.value })} />
          </FormField>
          <FormField label="Fires when a member">
            <select className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm" value={draft.event} onChange={(e) => change({ event: e.target.value === "LOSES" ? "LOSES" : "GAINS" })}>
              <option value="GAINS">gains all of these roles</option>
              <option value="LOSES">stops having all of these roles</option>
            </select>
          </FormField>
        </FieldGrid>
        <FormField label={`These roles (up to ${list.maxWhen})`} as="group" size="lg">
          <RolePicker roles={roles} value={draft.when} max={list.maxWhen} disabled={pending} onChange={(when) => change({ when })} />
        </FormField>
        <FormField label="Then give them" as="group" size="lg">
          <RolePicker roles={roles} value={draft.add} max={list.maxThen} disabled={pending} onChange={(add) => change({ add })} />
        </FormField>
        <FormField label="And take away" as="group" size="lg">
          <RolePicker roles={roles} value={draft.remove} max={list.maxThen} disabled={pending} onChange={(remove) => change({ remove })} />
        </FormField>
        <Toggle checked={draft.enabled} onChange={(next) => change({ enabled: next })} label="Rule is on" detail="Off, the rule is kept but does nothing. It only reacts to role changes made after it is on." />
        {error && <Notice tone="error" title={error} />}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButton}
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                const result = await actions.save(rule?.id ?? null, draft);
                if (!result.ok) return setError(result.error);
                onList(result.data);
                setSaved(draft);
              })
            }
          >
            Save rule
          </button>
          {rule ? (
            <>
              <button type="button" className={ghostButton} disabled={!dirty} onClick={() => setDraft(saved)}>
                Discard
              </button>
              <span className="flex-1" />
              <button
                type="button"
                className={dangerButton}
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`Delete the rule "${saved.name}"? Roles it already gave stay as they are.`)) return;
                  start(async () => {
                    const result = await actions.remove(rule.id);
                    if (!result.ok) return setError(result.error);
                    onList(result.data);
                  });
                }}
              >
                Delete
              </button>
            </>
          ) : (
            <button type="button" className={ghostButton} onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
}
