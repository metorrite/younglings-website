"use client";

import { useState, useTransition } from "react";
import { saveSelfRolesAction } from "@/app/admin/(console)/actions";
import type { GuildRole, SelfRoleConfig } from "@/lib/jonnybot-admin";
import { Card, dangerButton, ghostButton, inputClass, Notice, primaryButton } from "./ui";

interface Row {
  roleId: string;
  label: string;
  description: string;
  name: string | null;
  safe: boolean;
}

export function SelfRolesEditor({ initial, roles }: { initial: SelfRoleConfig[]; roles: GuildRole[] }) {
  const toRows = (configs: SelfRoleConfig[]): Row[] =>
    configs.map((c) => ({ roleId: c.roleId, label: c.label ?? "", description: c.description ?? "", name: c.name, safe: c.safe }));

  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const [adding, setAdding] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const chosen = new Set(rows.map((r) => r.roleId));
  const available = roles.filter((r) => !chosen.has(r.id) && !r.managed);

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await saveSelfRolesAction(rows.map(({ roleId, label, description }) => ({ roleId, label, description })));
      if (!result.ok) setError(result.error);
      else {
        setRows(toRows(result.data));
        setSaved(true);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card
        title="Roles members can pick"
        hint="Members add or remove these themselves on their profile page. JonnyBot refuses any role with powerful permissions (Administrator, Manage Roles, Ban Members, Mention @everyone and similar) or that sits above its own role."
      >
        {rows.length === 0 && <p className="text-sm text-muted">No roles yet — add one below.</p>}

        {rows.map((row, i) => (
          <div key={row.roleId} className="space-y-2 rounded-md border border-surface-border bg-background/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">
                @{row.name ?? "(deleted role)"}
                {!row.safe && <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-normal text-red-300">can&apos;t be assigned right now</span>}
              </span>
              <div className="flex gap-1.5">
                <button type="button" className={ghostButton} disabled={i === 0} onClick={() => setRows((r) => { const n = [...r]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })} aria-label="Move up">
                  ↑
                </button>
                <button type="button" className={ghostButton} disabled={i === rows.length - 1} onClick={() => setRows((r) => { const n = [...r]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })} aria-label="Move down">
                  ↓
                </button>
                <button type="button" className={dangerButton} onClick={() => setRows((r) => r.filter((x) => x.roleId !== row.roleId))}>
                  Remove
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={inputClass} placeholder="Label (defaults to the role name)" maxLength={40} value={row.label} onChange={(e) => setRows((r) => r.map((x) => (x.roleId === row.roleId ? { ...x, label: e.target.value } : x)))} aria-label="Label" />
              <input className={inputClass} placeholder="Short description (optional)" maxLength={120} value={row.description} onChange={(e) => setRows((r) => r.map((x) => (x.roleId === row.roleId ? { ...x, description: e.target.value } : x)))} aria-label="Description" />
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-sm">
            <span className="mb-1 block text-xs text-muted">Add a role</span>
            <select className={inputClass} value={adding} onChange={(e) => setAdding(e.target.value)}>
              <option value="">Choose a role…</option>
              {available.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={ghostButton}
            disabled={!adding || rows.length >= 25}
            onClick={() => {
              const role = roles.find((r) => r.id === adding);
              if (role) setRows((r) => [...r, { roleId: role.id, label: "", description: "", name: role.name, safe: true }]);
              setAdding("");
            }}
          >
            + Add
          </button>
        </div>
      </Card>

      {error && <Notice tone="error" title={error} />}
      {saved && <Notice tone="success" title="Saved." />}

      <button type="button" className={primaryButton} disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save roles"}
      </button>
    </div>
  );
}
