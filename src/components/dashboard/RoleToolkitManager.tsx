"use client";

import { useEffect, useState, useTransition } from "react";
import { dangerButton, FormField, ghostButton, Notice, primaryButton } from "@/components/admin/ui";
import { RolePicker } from "@/components/dashboard/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid } from "@/components/dashboard/ui/Layout";
import type { GuildRole, RoleBulkJob, RoleToolkit } from "@/lib/jonnybot-admin";

type Result<T> = { ok: true; data: T } | { ok: false; error: string; problems: string[] };

export interface RoleToolkitActions {
  saveAllow: (groupKey: string, roleIds: string[]) => Promise<Result<RoleToolkit>>;
  plan: (input: { mode: "ADD" | "REMOVE"; sourceRoleId: string; targetRoleId: string }) => Promise<Result<RoleBulkJob>>;
  act: (jobId: string, action: "start" | "pause" | "cancel") => Promise<Result<RoleBulkJob>>;
  status: (jobId: string) => Promise<Result<RoleBulkJob>>;
}

const STATUS_LABEL: Record<RoleBulkJob["status"], string> = { PLANNED: "Preview", RUNNING: "Running", PAUSED: "Paused", DONE: "Done", CANCELLED: "Cancelled" };

/**
 * Two things. Which roles each permission group may give and take with /role (the Admin group needs no list). And bulk role changes: choose the role
 * people hold now and the role to give or take, press Preview to see who it would change (nothing changes yet), then Start. A job is never started by
 * the page or by the bot on its own: it moves only when a person presses a button, and it pauses (it does not resume) if the bot restarts.
 */
export function RoleToolkitManager({ initial, roles, actions }: { initial: RoleToolkit; roles: GuildRole[]; actions: RoleToolkitActions }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {error && <Notice tone="error" title={error} />}
      <AllowLists data={data} roles={roles} actions={actions} onData={setData} onError={setError} />
      <Bulk data={data} roles={roles} actions={actions} onData={setData} onError={setError} />
    </div>
  );
}

function AllowLists({ data, roles, actions, onData, onError }: { data: RoleToolkit; roles: GuildRole[]; actions: RoleToolkitActions; onData: (d: RoleToolkit) => void; onError: (e: string | null) => void }) {
  return (
    <CollapsibleCard
      id="toolkit-allow"
      title="Who may give and take which roles"
      hint="Members of a group can use /role give and /role take on the roles listed for it, and no others. Admins can use any role the bot is allowed to hand out. The Member and Guest roles are kept by the clan role sync and can never be listed."
      defaultOpen
    >
      <div className="space-y-6">
        {data.groups.filter((g) => g.key !== "admin").map((group) => (
          <GroupList key={group.key} group={group} roles={roles} actions={actions} onData={onData} onError={onError} />
        ))}
      </div>
    </CollapsibleCard>
  );
}

function GroupList({ group, roles, actions, onData, onError }: { group: RoleToolkit["groups"][number]; roles: GuildRole[]; actions: RoleToolkitActions; onData: (d: RoleToolkit) => void; onError: (e: string | null) => void }) {
  const [draft, setDraft] = useState(group.roleIds);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify([...draft].sort()) !== JSON.stringify([...group.roleIds].sort());

  return (
    <div className="space-y-2 rounded-lg border border-surface-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{group.name}</h3>
        <Chip>{group.roleIds.length} roles</Chip>
      </div>
      <RolePicker roles={roles} value={draft} max={100} disabled={pending} onChange={setDraft} />
      <div className="flex gap-2">
        <button
          type="button"
          className={primaryButton}
          disabled={pending || !dirty}
          onClick={() =>
            start(async () => {
              onError(null);
              const result = await actions.saveAllow(group.key, draft);
              if (!result.ok) return onError(result.error);
              onData(result.data);
            })
          }
        >
          Save
        </button>
        <button type="button" className={ghostButton} disabled={!dirty} onClick={() => setDraft(group.roleIds)}>
          Discard
        </button>
      </div>
    </div>
  );
}

function Bulk({ data, roles, actions, onData, onError }: { data: RoleToolkit; roles: GuildRole[]; actions: RoleToolkitActions; onData: (d: RoleToolkit) => void; onError: (e: string | null) => void }) {
  const [mode, setMode] = useState<"ADD" | "REMOVE">("ADD");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [job, setJob] = useState<RoleBulkJob | null>(null);
  const [pending, start] = useTransition();
  const sorted = [...roles].filter((r) => !r.managed).sort((a, b) => b.position - a.position);

  // while a job runs, look at it every few seconds so the progress is real
  useEffect(() => {
    if (!job || job.status !== "RUNNING") return;
    const timer = window.setInterval(() => {
      void actions.status(job.id).then((r) => {
        if (r.ok) setJob(r.data);
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [job, actions]);

  function press(action: "start" | "pause" | "cancel") {
    if (!job) return;
    if (action === "start" && !window.confirm(`Change the roles of ${job.total} members now? This changes real members' roles.`)) return;
    onError(null);
    start(async () => {
      const result = await actions.act(job.id, action);
      if (!result.ok) return onError(result.error);
      setJob(result.data);
    });
  }

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "(deleted role)";

  return (
    <CollapsibleCard id="toolkit-bulk" title="Change a role for many members" hint="A preview first, always. Nothing changes until you press Start. Admins only." defaultOpen>
      <div className="space-y-5">
        <FieldGrid>
          <FormField label="What to do">
            <select className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm" value={mode} onChange={(e) => setMode(e.target.value === "REMOVE" ? "REMOVE" : "ADD")}>
              <option value="ADD">Give a role</option>
              <option value="REMOVE">Take a role away</option>
            </select>
          </FormField>
          <FormField label="To everyone who has this role">
            <select className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">Choose a role…</option>
              {sorted.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={mode === "ADD" ? "Give them" : "Take from them"}>
            <select className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Choose a role…</option>
              {sorted.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>
        </FieldGrid>
        <button
          type="button"
          className={ghostButton}
          disabled={pending || !source || !target || source === target || job?.status === "RUNNING"}
          onClick={() =>
            start(async () => {
              onError(null);
              const result = await actions.plan({ mode, sourceRoleId: source, targetRoleId: target });
              if (!result.ok) return onError(result.error);
              setJob(result.data);
            })
          }
        >
          Preview who would change
        </button>

        {job && (
          <div className="space-y-3 rounded-lg border border-gold/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={job.status === "DONE" ? "good" : job.status === "RUNNING" ? "warn" : "plain"}>{STATUS_LABEL[job.status]}</Chip>
              <p className="text-sm">
                {job.mode === "ADD" ? "Give" : "Take"} <strong>{job.targetName ?? roleName(job.targetRoleId)}</strong> {job.mode === "ADD" ? "to" : "from"} members with{" "}
                <strong>{job.sourceName ?? roleName(job.sourceRoleId)}</strong>
              </p>
            </div>
            <p className="text-sm">
              {job.status === "PLANNED" ? (
                <>
                  <strong>{job.total}</strong> members would change. Nobody has been changed yet.
                </>
              ) : (
                <>
                  {job.done} of {job.total} done{job.failed > 0 ? `, ${job.failed} could not be changed` : ""}.
                </>
              )}
            </p>
            {job.preview && job.preview.length > 0 && (
              <p className="text-xs text-muted">
                {job.preview.map((p) => p.name ?? `User ${p.id}`).join(", ")}
                {job.total > job.preview.length ? ` and ${job.total - job.preview.length} more` : ""}
              </p>
            )}
            {job.total === 0 && job.status === "PLANNED" && <p className="text-sm text-muted">Nobody needs this change, so there is nothing to start.</p>}
            <div className="flex flex-wrap gap-2">
              {(job.status === "PLANNED" || job.status === "PAUSED") && job.total > 0 && (
                <button type="button" className={primaryButton} disabled={pending} onClick={() => press("start")}>
                  {job.status === "PAUSED" ? "Resume" : "Start"}
                </button>
              )}
              {job.status === "RUNNING" && (
                <button type="button" className={ghostButton} disabled={pending} onClick={() => press("pause")}>
                  Pause
                </button>
              )}
              {(job.status === "PLANNED" || job.status === "RUNNING" || job.status === "PAUSED") && (
                <button type="button" className={dangerButton} disabled={pending} onClick={() => press("cancel")}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {data.jobs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Recent jobs</h3>
            <ul className="space-y-1 text-sm">
              {data.jobs.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center gap-2">
                  <Chip>{STATUS_LABEL[j.status]}</Chip>
                  <span>
                    {j.mode === "ADD" ? "Give" : "Take"} {j.targetName ?? "(deleted role)"} · {j.done}/{j.total}
                    {j.failed > 0 ? ` · ${j.failed} failed` : ""}
                  </span>
                  {(j.status === "PAUSED" || j.status === "PLANNED" || j.status === "RUNNING") && (
                    <button
                      type="button"
                      className={ghostButton}
                      onClick={() =>
                        start(async () => {
                          const r = await actions.status(j.id);
                          if (r.ok) {
                            setJob(r.data);
                            onData({ ...data });
                          }
                        })
                      }
                    >
                      Open
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
