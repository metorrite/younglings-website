"use client";

import { useState, useTransition } from "react";
import { Card, dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { RolePicker } from "@/components/dashboard/pickers";
import { type GuildRole, type PermissionGroupConfig, type PermissionGroupDraft, type PermissionGroups, type WelcomeActionResult } from "@/lib/jonnybot-admin";

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

/** A fresh id for a card, unique for as long as the page lives, so two cards can never be mistaken for each other whatever happens to the page. */
const localId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `row-${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Six dots: the usual "drag me" mark. */
function GripIcon() {
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
      {[3, 9, 15].flatMap((y) => [3, 11].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
    </svg>
  );
}

/** Moves the card `from` to where `to` is, but only among cards of the same kind (built-in levels stay with built-in levels). */
function reordered(rows: Row[], from: string, to: string): Row[] {
  const a = rows.findIndex((r) => r.local === from);
  const b = rows.findIndex((r) => r.local === to);
  if (a < 0 || b < 0 || a === b || rows[a].builtin !== rows[b].builtin) return rows;
  const next = [...rows];
  const [moved] = next.splice(a, 1);
  next.splice(b, 0, moved);
  return next;
}

function toRows(groups: PermissionGroupConfig[]): Row[] {
  return groups.map((g) => ({ ...g, local: localId() }));
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

  const [armed, setArmed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const custom = rows.filter((r) => !r.builtin);
  const move = (from: string, to: string) => setRows((all) => reordered(all, from, to));
  /** What makes a card a drag source and a drop target. The order is for the person's own reference: it is kept on this page and not saved. */
  const dragProps = (row: Row) => ({
    draggable: canEdit && armed === row.local,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", row.local);
      setDragging(row.local);
    },
    onDragEnd: () => {
      setDragging(null);
      setArmed(null);
      setOver(null);
    },
    onDragOver: (e: React.DragEvent) => {
      if (dragging && dragging !== row.local) {
        e.preventDefault();
        setOver(row.local);
      }
    },
    onDragLeave: () => setOver((o) => (o === row.local ? null : o)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragging) move(dragging, row.local);
      setDragging(null);
      setArmed(null);
      setOver(null);
    },
  });
  const cardClass = (row: Row) =>
    `flex gap-3 rounded-md border bg-background/40 p-4 transition ${over === row.local ? "border-gold" : "border-surface-border"} ${dragging === row.local ? "opacity-50" : ""}`;
  const handle = (row: Row) =>
    canEdit ? (
      <button
        type="button"
        aria-label={`Move ${row.name || "this group"}. Drag it, or press the up and down arrow keys.`}
        title="Drag to rearrange. The order is for your own reference and isn't saved yet."
        className="mt-0.5 flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted hover:bg-white/10 hover:text-foreground active:cursor-grabbing"
        onMouseDown={() => setArmed(row.local)}
        onMouseUp={() => setArmed(null)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          const same = rows.filter((r) => r.builtin === row.builtin);
          const at = same.findIndex((r) => r.local === row.local);
          const target = e.key === "ArrowUp" ? same[at - 1] : same[at + 1];
          if (target) move(row.local, target.local);
        }}
      >
        <GripIcon />
      </button>
    ) : null;
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
              <div key={row.local} className={cardClass(row)} {...dragProps(row)}>
                {handle(row)}
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-semibold">{BUILT_IN[row.key]?.label ?? row.name}</p>
                    <p className="text-xs text-muted">{BUILT_IN[row.key]?.blurb}</p>
                  </div>
                  <RolePicker roles={roles} value={row.roleIds} max={limits.maxRolesPerGroup} disabled={!canEdit} onChange={(ids) => patch(row.local, { roleIds: ids })} />
                  {includeHigher(row)}
                </div>
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
            <div key={row.local} className={cardClass(row)} {...dragProps(row)}>
              {handle(row)}
              <div className="min-w-0 flex-1 space-y-3">
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
