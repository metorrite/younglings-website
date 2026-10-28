"use client";

import { useState, useTransition } from "react";
import type { PremiumGrant, PremiumGrantInput, PremiumGuilds, PremiumHistory } from "@/lib/jonnybot-admin";
import { Card, dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton } from "./ui";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const day = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
/** A plan ends at the start of the day after the date the owner typed, so the date shown for editing is the day before. */
const endDateOf = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 86_400_000).toISOString().slice(0, 10) : "");

const ACTION_LABEL: Record<string, string> = { GRANT: "Granted", CHANGE: "Changed", REVOKE: "Revoked", EXPIRE: "Ran out" };

/**
 * The owner's Premium page: every server on a plan with its plan name, end date, note and source; grant, change and revoke; the plans ending within a week;
 * and each server's history. The bot refuses anyone but its owner whatever this page shows. No prices, no payments.
 */
export function PremiumConsole({
  initial,
  save,
  remove,
  history,
}: {
  initial: PremiumGuilds;
  save: (guildId: string, input: PremiumGrantInput) => Promise<Result<PremiumGuilds>>;
  remove: (guildId: string) => Promise<Result<PremiumGuilds>>;
  history: (guildId: string) => Promise<Result<PremiumHistory>>;
}) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ guildId: "", label: "", tier: "premium", expiresAt: "", note: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [shown, setShown] = useState<PremiumHistory | null>(null);

  function run(work: () => Promise<Result<PremiumGuilds>>, message: string, after?: () => void) {
    setError(null);
    setDone(null);
    start(async () => {
      const r = await work();
      if (!r.ok) return setError(r.error);
      setData(r.data);
      setDone(message);
      after?.();
    });
  }

  function showHistory(guildId: string) {
    setError(null);
    start(async () => {
      const r = await history(guildId);
      if (!r.ok) return setError(r.error);
      setShown(r.data);
    });
  }

  function edit(grant: PremiumGrant) {
    setEditing(grant.guildId);
    setForm({ guildId: grant.guildId, label: grant.label, tier: grant.tier, expiresAt: endDateOf(grant.expiresAt), note: grant.note ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const nameOf = (g: PremiumGrant) => g.name ?? (g.label || g.guildId);

  if (!data.canEdit) {
    return (
      <Card title="Premium">
        <p className="text-sm text-muted">Only JonnyBot&apos;s owner can see or change the premium plans.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {data.endingSoon.length > 0 && (
        <Card title="Ending soon" hint="These plans end within a week. They stop by themselves; nothing is sent to the server.">
          <ul className="divide-y divide-surface-border text-sm">
            {data.endingSoon.map((g) => (
              <li key={g.guildId} className="flex flex-wrap items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate font-medium">{nameOf(g)}</span>
                <span className="text-xs text-amber-300">ends {day(g.expiresAt)}</span>
                <button type="button" className={ghostButton} disabled={pending} onClick={() => edit(g)}>
                  Extend or change
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title={editing ? "Change a plan" : "Grant a plan"} hint="The server has to be one JonnyBot is in for the plan to matter. Leave the end date empty for no end.">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Server ID" hint="17 to 20 digits.">
            <input className={inputClass} value={form.guildId} disabled={editing !== null} inputMode="numeric" onChange={(e) => setForm({ ...form, guildId: e.target.value.replace(/\D/g, "") })} />
          </FormField>
          <FormField label="Whose it is" hint="Only a reminder for you.">
            <input className={inputClass} value={form.label} maxLength={60} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </FormField>
          <FormField label="Plan" hint="Lower-case letters, numbers and dashes. Premium is the one plan today.">
            <input className={inputClass} value={form.tier} maxLength={20} onChange={(e) => setForm({ ...form, tier: e.target.value })} />
          </FormField>
          <FormField label="Last day (optional)" hint="The plan runs through this day (UTC).">
            <input className={inputClass} type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </FormField>
          <FormField label="Private note (optional)" hint="Only you see this.">
            <input className={inputClass} value={form.note} maxLength={300} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </FormField>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButton}
            disabled={pending || form.guildId.length < 15}
            onClick={() =>
              run(
                () => save(form.guildId, { label: form.label, tier: form.tier || "premium", expiresAt: form.expiresAt, note: form.note, source: "manual" }),
                editing ? "Plan changed." : "Plan granted.",
                () => {
                  setEditing(null);
                  setForm({ guildId: "", label: "", tier: "premium", expiresAt: "", note: "" });
                },
              )
            }
          >
            {pending ? "Working…" : editing ? "Save changes" : "Grant plan"}
          </button>
          {editing && (
            <button type="button" className={ghostButton} onClick={() => { setEditing(null); setForm({ guildId: "", label: "", tier: "premium", expiresAt: "", note: "" }); }}>
              Cancel
            </button>
          )}
        </div>
        {error && <Notice tone="error" title={error} />}
        {done && <Notice tone="success" title={done} />}
      </Card>

      <Card title="Servers on a plan" hint="Every server here has a plan. A server that is not listed is on the free plan.">
        {data.guilds.length === 0 ? (
          <p className="text-sm text-muted">No server has a plan. Everyone is on the free plan.</p>
        ) : (
          <ul className="divide-y divide-surface-border text-sm">
            {data.guilds.map((g) => (
              <li key={g.guildId} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="min-w-0 flex-1 basis-48 font-medium">{nameOf(g)}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">{g.tier}</span>
                  <span className={`text-xs ${g.inForce ? "text-muted" : "text-red-300"}`}>{g.expiresAt ? (g.inForce ? `ends ${day(g.expiresAt)}` : `ended ${day(g.expiresAt)}`) : "no end"}</span>
                  <button type="button" className={ghostButton} disabled={pending} onClick={() => edit(g)}>
                    Change
                  </button>
                  <button type="button" className={ghostButton} disabled={pending} onClick={() => showHistory(g.guildId)}>
                    History
                  </button>
                  <button type="button" className={dangerButton} disabled={pending} onClick={() => window.confirm(`Take the plan away from ${nameOf(g)}?`) && run(() => remove(g.guildId), "Plan revoked.")}>
                    Revoke
                  </button>
                </div>
                <p className="text-xs text-muted">
                  {g.botPresent ? "JonnyBot is in this server." : "JonnyBot is not in this server, so the plan has no effect yet."} {g.label && g.name && g.label !== g.name ? `(${g.label}) ` : ""}
                  {g.note ? `Note: ${g.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {shown && (
        <Card title={`History of ${shown.guildId}`} hint="Newest first. Kept even after the plan is gone.">
          {shown.history.length === 0 ? (
            <p className="text-sm text-muted">Nothing recorded yet.</p>
          ) : (
            <ul className="divide-y divide-surface-border text-sm">
              {shown.history.map((h, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="w-20 font-medium">{ACTION_LABEL[h.action] ?? h.action}</span>
                  <span className="text-xs text-muted">{day(h.at)}</span>
                  <span className="text-xs">{h.tier ?? ""}</span>
                  <span className="text-xs text-muted">{h.expiresAt ? `until ${day(h.expiresAt)}` : h.action === "EXPIRE" ? "" : "no end"}</span>
                  <span className="text-xs text-muted">{h.byUser ? `by ${h.byUser}` : "automatic"}</span>
                  {h.note && <span className="text-xs text-muted">{h.note}</span>}
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={ghostButton} onClick={() => setShown(null)}>
            Close
          </button>
        </Card>
      )}
    </div>
  );
}
