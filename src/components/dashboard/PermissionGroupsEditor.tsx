"use client";

import { useState, useTransition } from "react";
import { Card, dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { discordColorCss, type GuildRole, type PermissionGroupConfig, type PermissionGroupDraft, type PermissionGroups, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Row = PermissionGroupConfig & { local: string };
type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

/** What each built-in level unlocks, so nobody has to guess what filling it in does. */
const BUILT_IN: Record<string, { label: string; blurb: string }> = {
  admin: {
    label: "Admin",
    blurb: "Full control: the admin tools in Discord, this dashboard, and who counts as staff. Nothing in the bot needs more than this.",
  },
  support: { label: "Support", blurb: "Can review and verify RuneScape link requests, and nothing else in the admin tools." },
  developer: { label: "Developer", blurb: "Can open this dashboard and edit most settings, but can't change who counts as staff." },
};

let counter = 0;
const localId = () => `row-${++counter}`;

function toRows(groups: PermissionGroupConfig[]): Row[] {
  return groups.map((g) => ({ ...g, local: localId() }));
}

/** The chosen roles as removable pills plus a dropdown for the rest, which stays usable on a server with hundreds of roles. */
function RolePicker({ roles, value, max, disabled, onChange }: { roles: GuildRole[]; value: string[]; max: number; disabled: boolean; onChange: (ids: string[]) => void }) {
  const [adding, setAdding] = useState("");
  const byId = new Map(roles.map((r) => [r.id, r]));
  const available = roles.filter((r) => !value.includes(r.id)).sort((a, b) => b.position - a.position);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.length === 0 && <span className="text-xs text-muted">No roles yet.</span>}
        {value.map((id) => {
          const role = byId.get(id);
          const color = role ? discordColorCss(role.color) : undefined;
          return (
            <span key={id} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${role ? "border-surface-border" : "border-red-500/40 text-red-300"}`}>
              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: color ?? "transparent" }} />
              {role ? role.name : "(deleted role)"}
              {!disabled && (
                <button type="button" aria-label={`Remove ${role ? role.name : "deleted role"}`} className="text-muted hover:text-red-400" onClick={() => onChange(value.filter((v) => v !== id))}>
                  ✕
                </button>
              )}
            </span>
          );
        })}
      </div>
      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${inputClass} max-w-xs`} value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Add a role">
            <option value="">Add a role…</option>
            {available.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={ghostButton}
            disabled={!adding || value.length >= max}
            onClick={() => {
              onChange([...value, adding]);
              setAdding("");
            }}
          >
            + Add
          </button>
          {value.length >= max && <span className="text-xs text-muted">At most {max} roles in a group.</span>}
        </div>
      )}
    </div>
  );
}

/**
 * A server's permission levels. Admin, Support and Developer are always there; "Web Dev", "Discord Dev" and so on can be added, each
 * holding as many server roles as it needs. A group of your own has no powers by itself: it shows up as a choice wherever a setting asks
 * "who can do this?".
 */
export function PermissionGroupsEditor({
  initial,
  roles,
  canEdit,
  save,
}: {
  initial: PermissionGroups;
  roles: GuildRole[];
  canEdit: boolean;
  save: (groups: PermissionGroupDraft[]) => Promise<WelcomeActionResult<PermissionGroups>>;
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initial.groups));
  const [limits, setLimits] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();

  const custom = rows.filter((r) => !r.builtin);
  const patch = (local: string, change: Partial<Row>) => {
    setRows((all) => all.map((r) => (r.local === local ? { ...r, ...change } : r)));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save(rows.map((r) => ({ key: r.key || null, name: r.name, includeHigher: r.includeHigher, roleIds: r.roleIds })));
      if (!result.ok) {
        setOutcome({ tone: "error", title: result.error, items: result.problems });
        return;
      }
      setLimits(result.data);
      setRows(toRows(result.data.groups));
      setOutcome({ tone: "success", title: "Saved." });
    });
  }

  function addGroup() {
    setRows((all) => [...all, { local: localId(), key: "", name: "", builtin: false, includeHigher: false, roleIds: [] }]);
    setOutcome(null);
  }

  const includeHigher = (row: Row) => (
    <label className="flex items-center gap-2 text-xs text-muted">
      <input type="checkbox" disabled={!canEdit} checked={row.includeHigher} onChange={(e) => patch(row.local, { includeHigher: e.target.checked })} />
      Also include anyone with a role ranked above the lowest of these
    </label>
  );

  return (
    <div className="space-y-6">
      {!canEdit && <Notice tone="error" title="Only an Admin can change the permission groups. You can see them here." />}

      <Card title="Bot levels" hint="These three always exist. Fill each with the server roles that should have it; anyone holding any one of the roles is in.">
        <div className="space-y-4">
          {rows
            .filter((r) => r.builtin)
            .map((row) => (
              <div key={row.local} className="space-y-3 rounded-md border border-surface-border bg-background/40 p-4">
                <div>
                  <p className="text-sm font-semibold">{BUILT_IN[row.key]?.label ?? row.name}</p>
                  <p className="text-xs text-muted">{BUILT_IN[row.key]?.blurb}</p>
                </div>
                <RolePicker roles={roles} value={row.roleIds} max={limits.maxRolesPerGroup} disabled={!canEdit} onChange={(ids) => patch(row.local, { roleIds: ids })} />
                {includeHigher(row)}
              </div>
            ))}
        </div>
      </Card>

      <Card
        title="Your own groups"
        hint="Make a group for any job your server has, such as Web Dev or Event Host, and give it as many roles as you like. A group has no powers of its own: pick it wherever a setting asks who can use something."
      >
        <div className="space-y-4">
          {custom.length === 0 && <p className="text-sm text-muted">No groups of your own yet.</p>}
          {custom.map((row) => (
            <div key={row.local} className="space-y-3 rounded-md border border-surface-border bg-background/40 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <FormField label="Group name">
                    <input
                      className={inputClass}
                      value={row.name}
                      maxLength={limits.maxNameLength}
                      disabled={!canEdit}
                      placeholder="e.g. Web Dev"
                      onChange={(e) => patch(row.local, { name: e.target.value })}
                    />
                  </FormField>
                </div>
                {canEdit && (
                  <button type="button" className={dangerButton} onClick={() => { setRows((all) => all.filter((r) => r.local !== row.local)); setOutcome(null); }}>
                    Remove group
                  </button>
                )}
              </div>
              <RolePicker roles={roles} value={row.roleIds} max={limits.maxRolesPerGroup} disabled={!canEdit} onChange={(ids) => patch(row.local, { roleIds: ids })} />
              {includeHigher(row)}
            </div>
          ))}
          {canEdit && (
            <button type="button" className={ghostButton} disabled={custom.length >= limits.maxCustomGroups} onClick={addGroup}>
              + Add a group
            </button>
          )}
        </div>
      </Card>

      {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
      {canEdit && (
        <button type="button" className={primaryButton} disabled={pending} onClick={submit}>
          {pending ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}
