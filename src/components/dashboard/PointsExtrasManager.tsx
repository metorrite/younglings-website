"use client";

import { confirmDialog } from "@/components/ui/Dialogs";
import { useState, useTransition } from "react";
import { dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton, StatusBadge } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import type {
  GuildStructure,
  PointsRoleRewardInput,
  PointsRoleRewards,
  PointsTriggerInput,
  PointsTriggers,
  WelcomeActionResult,
} from "@/lib/jonnybot-admin";

export interface PointsExtrasActions {
  saveRole: (input: PointsRoleRewardInput) => Promise<WelcomeActionResult<PointsRoleRewards>>;
  removeRole: (id: string) => Promise<WelcomeActionResult<PointsRoleRewards>>;
  saveTrigger: (input: PointsTriggerInput) => Promise<WelcomeActionResult<PointsTriggers>>;
  removeTrigger: (id: string) => Promise<WelcomeActionResult<PointsTriggers>>;
}

type Problem = { title: string; items: string[] } | null;

interface RoleDraft {
  id: string | null;
  threshold: string;
  roleId: string;
  removeLower: boolean;
}
const EMPTY_ROLE: RoleDraft = { id: null, threshold: "", roleId: "", removeLower: false };

interface TriggerDraft {
  id: string | null;
  keyword: string;
  points: string;
  cooldownSeconds: string;
  dailyCap: string;
  enabled: boolean;
}
const EMPTY_TRIGGER: TriggerDraft = { id: null, keyword: "", points: "1", cooldownSeconds: "60", dailyCap: "5", enabled: true };

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;

/**
 * The two extras of a server's points. Role rewards: at a number of points a member is given a role, once (a role staff takes away stays gone, and spending
 * points never takes one back), optionally swapping out the roles of the lower rewards. Keyword triggers: saying a word while mentioning someone gives them
 * points, with a cool-down and a daily cap so it can't be farmed. Role rewards are in Basic. Triggers are in Advanced, and stay visible in Basic once there is one.
 */
export function PointsExtrasManager({
  roles: initialRoles,
  triggers: initialTriggers,
  structure,
  unit,
  actions,
}: {
  roles: PointsRoleRewards;
  triggers: PointsTriggers;
  structure: GuildStructure;
  unit: string;
  actions: PointsExtrasActions;
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [triggers, setTriggers] = useState(initialTriggers);
  const [roleDraft, setRoleDraft] = useState<RoleDraft>(EMPTY_ROLE);
  const [roleOpen, setRoleOpen] = useState(initialRoles.rewards.length === 0);
  const [triggerDraft, setTriggerDraft] = useState<TriggerDraft>(EMPTY_TRIGGER);
  const [triggerOpen, setTriggerOpen] = useState(initialTriggers.triggers.length === 0);
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const showTriggers = advanced || triggers.triggers.length > 0;

  const selectable = structure.roles.filter((r) => !r.managed).sort((a, b) => b.position - a.position);
  const roleName = new Map(structure.roles.map((r) => [r.id, r.name]));

  function run<T>(work: () => Promise<WelcomeActionResult<T>>, done: string, apply: (data: T) => void, after?: () => void) {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await work();
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      apply(result.data);
      setNote(done);
      after?.();
    });
  }

  const saveRole = () =>
    run(
      () =>
        actions.saveRole({
          id: roleDraft.id ?? undefined,
          threshold: Number(roleDraft.threshold),
          roleId: roleDraft.roleId,
          removeLower: roleDraft.removeLower,
        }),
      "Saved. It is given the next time a member's points go up.",
      setRoles,
      () => {
        setRoleDraft(EMPTY_ROLE);
        setRoleOpen(false);
      },
    );

  const saveTrigger = () =>
    run(
      () =>
        actions.saveTrigger({
          id: triggerDraft.id ?? undefined,
          keyword: triggerDraft.keyword,
          points: Number(triggerDraft.points),
          cooldownSeconds: Number(triggerDraft.cooldownSeconds),
          dailyCap: Number(triggerDraft.dailyCap),
          enabled: triggerDraft.enabled,
        }),
      "Saved.",
      setTriggers,
      () => {
        setTriggerDraft(EMPTY_TRIGGER);
        setTriggerOpen(false);
      },
    );

  return (
    <div className="space-y-4">
      <CollapsibleCard
        id="points-role-rewards"
        title="Role rewards"
        hint={`A role members are given when they reach a number of ${unit}.`}
        open={roleOpen}
        onOpenChange={setRoleOpen}
        summary={<Chip tone={roles.rewards.length > 0 ? "good" : "plain"}>{plural(roles.rewards.length, "reward", "rewards")}</Chip>}
        info={`Checked whenever a member's ${unit} go up, by any route (an award, an approved screenshot, an event prize, a keyword). Each reward is given once per member: a role staff takes away stays gone, and spending ${unit} on a prize never takes a role back. Members who are already past a number when you add it are given the role the next time their ${unit} go up. JonnyBot only hands out ordinary roles below its own role, with no powerful permissions.`}
      >
        <FieldGrid>
          <FormField label={`At this many ${unit}`} size="sm" hint={`1 to ${roles.maxThreshold.toLocaleString("en-GB")}.`}>
            <input className={inputClass} inputMode="numeric" value={roleDraft.threshold} placeholder="100" onChange={(e) => setRoleDraft({ ...roleDraft, threshold: e.target.value })} />
          </FormField>
          <FormField label="Give this role" size="md">
            <select className={inputClass} value={roleDraft.roleId} onChange={(e) => setRoleDraft({ ...roleDraft, roleId: e.target.value })}>
              <option value="">Choose a role…</option>
              {selectable.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>
        </FieldGrid>
        <Toggle
          checked={roleDraft.removeLower}
          onChange={(on) => setRoleDraft({ ...roleDraft, removeLower: on })}
          label="Take away the roles of the lower rewards"
          detail="Moves the member up a ladder (Bronze, then Silver) instead of piling roles on."
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryButton} disabled={pending || !roleDraft.threshold.trim() || !roleDraft.roleId} onClick={saveRole}>
            {pending ? "Saving…" : roleDraft.id ? "Save changes" : "Add role reward"}
          </button>
          {roleDraft.id && (
            <button
              type="button"
              className={ghostButton}
              onClick={() => {
                setRoleDraft(EMPTY_ROLE);
                setRoleOpen(false);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </CollapsibleCard>

      {roles.rewards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">
          No role rewards yet. Add one above and members are given the role when their {unit} reach the number.
        </p>
      ) : (
        <PanelGrid min="20rem" gap="gap-3">
          {roles.rewards.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5">
              <div>
                <p className="font-semibold">
                  {r.threshold.toLocaleString("en-GB")} {unit}
                </p>
                <p className="mt-0.5 text-sm text-muted">Gives @{r.roleName ?? roleName.get(r.roleId) ?? "a deleted role"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={r.problem ? "warn" : "good"}>{r.problem ? "Not working" : "Active"}</StatusBadge>
                {r.removeLower && <StatusBadge tone="muted">Replaces lower roles</StatusBadge>}
              </div>
              {r.problem && <p className="text-sm text-amber-300">{r.problem}</p>}
              <div className="mt-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold"
                  onClick={() => {
                    setRoleDraft({ id: r.id, threshold: String(r.threshold), roleId: r.roleId, removeLower: r.removeLower });
                    setRoleOpen(true);
                  }}
                >
                  Change
                </button>
                <button
                  type="button"
                  className={dangerButton}
                  disabled={pending}
                  onClick={async () => {
                    if (!(await confirmDialog({ title: "Remove this role reward?", body: "Members keep any role they were already given.", confirmLabel: "Remove", tone: "danger" }))) return;
                    run(() => actions.removeRole(r.id), "Removed.", setRoles);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </PanelGrid>
      )}

      {showTriggers && (
        <>
          <CollapsibleCard
            id="points-triggers"
            title="Keyword triggers"
            hint={`Saying a word while mentioning someone gives them ${unit}, like "thanks @Zezima".`}
            open={triggerOpen}
            onOpenChange={setTriggerOpen}
            summary={<Chip tone={triggers.triggers.length > 0 ? "good" : "plain"}>{plural(triggers.triggers.length, "trigger", "triggers")}</Chip>}
            info={`The person mentioned is paid, never the writer and never a bot, and one message pays at most ${triggers.maxReceivers} people. The cool-down stops the same writer setting a trigger off again too soon, the same writer thanking the same person only counts once a day, and the daily cap limits how often one member can be paid by a trigger in a day (UTC). Points must be switched on above.`}
          >
            <FieldGrid>
              <FormField label="Word or phrase" size="md" hint="Matched as whole words, any capitals.">
                <input className={inputClass} value={triggerDraft.keyword} maxLength={40} placeholder="thanks" onChange={(e) => setTriggerDraft({ ...triggerDraft, keyword: e.target.value })} />
              </FormField>
              <FormField label={`${unit[0].toUpperCase()}${unit.slice(1)} given`} size="sm" hint={`1 to ${triggers.maxPoints}.`}>
                <input className={inputClass} inputMode="numeric" value={triggerDraft.points} onChange={(e) => setTriggerDraft({ ...triggerDraft, points: e.target.value })} />
              </FormField>
              <FormField label="Cool-down (seconds)" size="sm" hint="Per writer. 0 for none.">
                <input className={inputClass} inputMode="numeric" value={triggerDraft.cooldownSeconds} onChange={(e) => setTriggerDraft({ ...triggerDraft, cooldownSeconds: e.target.value })} />
              </FormField>
              <FormField label="Most times a day a member is paid" size="sm" hint={`1 to ${triggers.maxDailyCap}.`}>
                <input className={inputClass} inputMode="numeric" value={triggerDraft.dailyCap} onChange={(e) => setTriggerDraft({ ...triggerDraft, dailyCap: e.target.value })} />
              </FormField>
            </FieldGrid>
            <Toggle checked={triggerDraft.enabled} onChange={(on) => setTriggerDraft({ ...triggerDraft, enabled: on })} label="Switched on" />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={primaryButton} disabled={pending || !triggerDraft.keyword.trim()} onClick={saveTrigger}>
                {pending ? "Saving…" : triggerDraft.id ? "Save changes" : "Add trigger"}
              </button>
              {triggerDraft.id && (
                <button
                  type="button"
                  className={ghostButton}
                  onClick={() => {
                    setTriggerDraft(EMPTY_TRIGGER);
                    setTriggerOpen(false);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </CollapsibleCard>

          {triggers.triggers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">No keyword triggers yet. Add one above.</p>
          ) : (
            <PanelGrid min="20rem" gap="gap-3">
              {triggers.triggers.map((t) => (
                <div key={t.id} className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5">
                  <div>
                    <p className="font-semibold">“{t.keyword}”</p>
                    <p className="mt-0.5 text-sm text-muted">
                      Gives {t.points} {unit}, cool-down {t.cooldownSeconds}s, up to {t.dailyCap} a day per member
                    </p>
                  </div>
                  <StatusBadge tone={t.enabled ? "good" : "muted"}>{t.enabled ? "Active" : "Paused"}</StatusBadge>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold"
                      onClick={() => {
                        setTriggerDraft({ id: t.id, keyword: t.keyword, points: String(t.points), cooldownSeconds: String(t.cooldownSeconds), dailyCap: String(t.dailyCap), enabled: t.enabled });
                        setTriggerOpen(true);
                      }}
                    >
                      Change
                    </button>
                    <button type="button" className={dangerButton} disabled={pending} onClick={() => run(() => actions.removeTrigger(t.id), "Removed.", setTriggers)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </PanelGrid>
          )}
        </>
      )}
      {!showTriggers && <MoreInAdvanced>keyword triggers, which give {unit} when someone says a word like “thanks” and mentions a member.</MoreInAdvanced>}

      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}
    </div>
  );
}
