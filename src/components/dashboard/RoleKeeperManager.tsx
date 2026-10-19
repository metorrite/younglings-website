"use client";

import { useState, useTransition } from "react";
import { dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { RolePicker } from "@/components/dashboard/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid } from "@/components/dashboard/ui/Layout";
import type { GuildRole, RoleKeeper } from "@/lib/jonnybot-admin";

type Result = Promise<{ ok: true; data: RoleKeeper } | { ok: false; error: string; problems: string[] }>;

export interface RoleKeeperActions {
  saveSticky: (roleIds: string[]) => Result;
  addKept: (userId: string, roleId: string) => Result;
  removeKept: (id: string) => Result;
  addTemp: (userId: string, roleId: string, duration: string) => Result;
  endTemp: (id: string) => Result;
}

/**
 * Sticky roles (given back to anyone who leaves holding them and returns), roles kept on single members, and timed roles. The Member / Guest roles of the
 * clan role sync and the staff permission roles can never be used here: the bot refuses them. Adding a kept or timed role gives it to that member straight away.
 */
export function RoleKeeperManager({ initial, roles, actions }: { initial: RoleKeeper; roles: GuildRole[]; actions: RoleKeeperActions }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [sticky, setSticky] = useState(initial.sticky);
  const [keptUser, setKeptUser] = useState("");
  const [keptRole, setKeptRole] = useState("");
  const [tempUser, setTempUser] = useState("");
  const [tempRole, setTempRole] = useState("");
  const [duration, setDuration] = useState("");
  const sorted = [...roles].filter((r) => !r.managed).sort((a, b) => b.position - a.position);
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "(deleted role)";
  const stickyDirty = JSON.stringify([...sticky].sort()) !== JSON.stringify([...data.sticky].sort());

  function run(work: () => Result, after?: (d: RoleKeeper) => void) {
    setError(null);
    start(async () => {
      const result = await work();
      if (!result.ok) return setError(result.error);
      setData(result.data);
      after?.(result.data);
    });
  }

  const select = "w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      {error && <Notice tone="error" title={error} />}

      <CollapsibleCard id="keeper-sticky" title="Sticky roles" defaultOpen summary={<Chip>{data.sticky.length} roles</Chip>}
        hint="Anyone who leaves holding one of these gets it back when they rejoin. Use it for roles like Muted that someone could shake off by leaving. Given back once per leave.">
        <div className="space-y-3">
          <RolePicker roles={roles} value={sticky} max={data.maxSticky} disabled={pending} onChange={setSticky} />
          <div className="flex gap-2">
            <button type="button" className={primaryButton} disabled={pending || !stickyDirty} onClick={() => run(() => actions.saveSticky(sticky), (d) => setSticky(d.sticky))}>
              Save
            </button>
            <button type="button" className={ghostButton} disabled={!stickyDirty} onClick={() => setSticky(data.sticky)}>
              Discard
            </button>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="keeper-kept" title="Roles kept on a member" summary={<Chip>{data.kept.length} kept</Chip>}
        hint="A role marked here is given back every time that member rejoins, until you remove it. Adding one also gives the role to them now.">
        <div className="space-y-4">
          <FieldGrid>
            <FormField label="Member's Discord ID" hint="Right-click them in Discord with Developer Mode on and choose Copy User ID.">
              <input className={inputClass} value={keptUser} inputMode="numeric" maxLength={20} onChange={(e) => setKeptUser(e.target.value)} />
            </FormField>
            <FormField label="Role">
              <select className={select} value={keptRole} onChange={(e) => setKeptRole(e.target.value)}>
                <option value="">Choose a role…</option>
                {sorted.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </FormField>
          </FieldGrid>
          <button type="button" className={primaryButton} disabled={pending || !keptUser.trim() || !keptRole} onClick={() => run(() => actions.addKept(keptUser.trim(), keptRole), () => setKeptUser(""))}>
            Keep this role on them
          </button>
          {data.kept.length === 0 ? (
            <p className="text-sm text-muted">Nothing is kept on any member yet.</p>
          ) : (
            <ul className="divide-y divide-white/10 text-sm">
              {data.kept.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <strong>{k.userName ?? `User ${k.userId}`}</strong> keeps <strong>{roleName(k.roleId)}</strong>
                  </span>
                  <button type="button" className={ghostButton} disabled={pending} onClick={() => run(() => actions.removeKept(k.id))}>
                    Stop keeping
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="keeper-temp" title="Temporary roles" summary={<Chip>{data.temp.length} running</Chip>}
        hint="A role taken off by itself after the time you choose. It survives bot restarts, and a member who leaves and returns before it ends gets it back until then.">
        <div className="space-y-4">
          <FieldGrid>
            <FormField label="Member's Discord ID">
              <input className={inputClass} value={tempUser} inputMode="numeric" maxLength={20} onChange={(e) => setTempUser(e.target.value)} />
            </FormField>
            <FormField label="Role">
              <select className={select} value={tempRole} onChange={(e) => setTempRole(e.target.value)}>
                <option value="">Choose a role…</option>
                {sorted.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="For how long" hint="Like 30m, 2h, 7d, 1w or 1d12h (1 minute to 365 days).">
              <input className={inputClass} value={duration} maxLength={20} onChange={(e) => setDuration(e.target.value)} />
            </FormField>
          </FieldGrid>
          <button type="button" className={primaryButton} disabled={pending || !tempUser.trim() || !tempRole || !duration.trim()} onClick={() => run(() => actions.addTemp(tempUser.trim(), tempRole, duration.trim()), () => setTempUser(""))}>
            Give for this long
          </button>
          {data.temp.length === 0 ? (
            <p className="text-sm text-muted">No timed roles are running.</p>
          ) : (
            <ul className="divide-y divide-white/10 text-sm">
              {data.temp.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <strong>{t.userName ?? `User ${t.userId}`}</strong> has <strong>{roleName(t.roleId)}</strong> until {new Date(t.expiresAt).toLocaleString()}
                  </span>
                  <button type="button" className={dangerButton} disabled={pending} onClick={() => run(() => actions.endTemp(t.id))}>
                    End now
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
}
