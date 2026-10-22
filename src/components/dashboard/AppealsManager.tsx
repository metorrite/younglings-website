"use client";

import { useState, useTransition } from "react";
import { dangerButton, formatUtc, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { AppealRow, AppealSettings, AppealsView, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Actions = {
  save: (input: AppealSettings) => Promise<WelcomeActionResult<AppealsView>>;
  decide: (appealId: string, approve: boolean, note: string) => Promise<WelcomeActionResult<AppealsView>>;
};

const STATUS: Record<AppealRow["status"], { text: string; tone: "good" | "warn" | "plain" }> = {
  OPEN: { text: "Waiting", tone: "warn" },
  APPROVED: { text: "Approved", tone: "good" },
  REJECTED: { text: "Turned down", tone: "plain" },
};

/**
 * The Appeals page (T-033): switch appeals on, pick the ticket panel they open in, the cooldown after a rejection and the optional copy channel; then
 * every appeal with Approve (lifts the ban or timeout as you, if you may) and Reject (with the reason they see).
 */
export function AppealsManager({ guildId, initial, channels, actions }: { guildId: string; initial: AppealsView; channels: { id: string; name: string; canPost: boolean }[]; actions: Actions }) {
  const [view, setView] = useState(initial);
  const [settings, setSettings] = useState(initial.settings);
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(settings) !== JSON.stringify(view.settings);
  const open = view.appeals.filter((a) => a.status === "OPEN");

  const save = () =>
    start(async () => {
      setOutcome(null);
      const r = await actions.save(settings);
      if (!r.ok) return setOutcome({ tone: "error", title: r.error });
      setView(r.data);
      setSettings(r.data.settings);
      setOutcome({ tone: "success", title: "Saved." });
    });

  const decide = (a: AppealRow, approve: boolean) =>
    start(async () => {
      setProblem(null);
      const r = await actions.decide(a.id, approve, notes[a.id] ?? "");
      if (!r.ok) return setProblem(r.error);
      setView(r.data);
    });

  return (
    <div className="space-y-6">
      <CollapsibleCard id="appeal-settings" title="Settings" hint="Off until you switch it on." defaultOpen={!view.settings.enabled} summary={<Chip tone={view.settings.enabled ? "good" : "plain"}>{view.settings.enabled ? "On" : "Off"}</Chip>}>
        <div className="space-y-4">
          <Toggle
            checked={settings.enabled}
            onChange={(next) => setSettings({ ...settings, enabled: next })}
            label="Take appeals on the website"
            detail="The DM someone gets when they are banned or timed out links to your server's appeal page (unless you set your own appeal link on the Cases page)."
            disabled={pending}
          />
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted">Ticket panel appeals open in (its category and staff roles are used; the person appealing never sees the ticket)</span>
            <select className={inputClass} value={settings.panelId ?? ""} onChange={(e) => setSettings({ ...settings, panelId: e.target.value || null })} disabled={pending}>
              <option value="">No ticket (appeals only show here)</option>
              {view.panels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted">Days before someone can appeal the same case again after it was turned down</span>
            <input
              className={`${inputClass} w-24`}
              inputMode="numeric"
              value={String(settings.cooldownDays)}
              onChange={(e) => setSettings({ ...settings, cooldownDays: Math.min(Math.max(Math.floor(Number(e.target.value.replace(/[^\d]/g, "")) || 0), 0), 365) })}
              disabled={pending}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted">Also post a read-only copy of each appeal in (optional)</span>
            <select className={inputClass} value={settings.mirrorChannelId ?? ""} onChange={(e) => setSettings({ ...settings, mirrorChannelId: e.target.value || null })} disabled={pending}>
              <option value="">No copy</option>
              {channels
                .filter((c) => c.canPost)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
            </select>
          </label>
          {view.appealLink && (
            <p className="text-xs text-muted">
              Your appeal page: <code className="select-all">{view.appealLink}</code>
            </p>
          )}
          <SaveBar pending={pending} onSave={save} outcome={outcome} dirty={dirty} onDiscard={() => setSettings(view.settings)} />
        </div>
      </CollapsibleCard>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Appeals {open.length > 0 && <Chip tone="warn">{open.length} waiting</Chip>}
        </h2>
        {problem && <Notice tone="error" title={problem} />}
        {view.appeals.length === 0 && <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">No appeals yet.</p>}
        <ul className="space-y-3">
          {view.appeals.map((a) => (
            <li key={a.id} className="space-y-2 rounded-xl border border-surface-border bg-surface p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {a.userName} · case #{a.caseNo}
                  {a.actionLabel ? ` (${a.actionLabel})` : ""}
                </span>
                <Chip tone={STATUS[a.status].tone}>{STATUS[a.status].text}</Chip>
              </div>
              {a.caseReason && <p className="text-xs text-muted">Case reason: {a.caseReason}</p>}
              <p className="whitespace-pre-wrap break-words">{a.text}</p>
              <p className="text-xs text-muted">
                Sent {formatUtc(a.createdAt)}
                {a.decidedAt ? ` · decided ${formatUtc(a.decidedAt)}` : ""}
                {a.ticketChannelId ? (
                  <>
                    {" · "}
                    <a href={`https://discord.com/channels/${guildId}/${a.ticketChannelId}`} className="text-gold hover:underline" target="_blank" rel="noreferrer">
                      open its ticket
                    </a>
                  </>
                ) : null}
              </p>
              {a.note && <p className="text-xs">{a.status === "REJECTED" ? "Why: " : "Note: "}{a.note}</p>}
              {a.status === "OPEN" && (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-64 flex-1 text-sm">
                    <span className="mb-1 block text-xs text-muted">Note (needed to turn it down; they see it)</span>
                    <input className={inputClass} value={notes[a.id] ?? ""} maxLength={500} onChange={(e) => setNotes((all) => ({ ...all, [a.id]: e.target.value }))} disabled={pending} />
                  </label>
                  <button type="button" className={primaryButton} disabled={pending} onClick={() => decide(a, true)}>
                    Approve: lift it
                  </button>
                  <button type="button" className={dangerButton} disabled={pending || (notes[a.id] ?? "").trim() === ""} onClick={() => decide(a, false)}>
                    Turn down
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">Approving lifts the ban or timeout as you, so you need the Ban Members or Moderate Members permission for it.</p>
      </section>
    </div>
  );
}
