"use client";

import { useState } from "react";
import { FormField, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import type { WelcomeActionResult } from "@/lib/jonnybot-admin";

/** What the bot sends for `events/defaults` (T-208): the server's own starting point for new events. */
export interface EventDefaultsView {
  defaults: { names: Record<string, string>; look?: string; gate?: string; setupMode?: string };
  names: { key: string; label: string; builtIn: string; pattern: string }[];
  looks: { id: string; label: string }[];
  builtIn: { look: string; gate: string; setupMode: string };
}

type Call = (method: "GET" | "PUT", path: string, body?: unknown) => Promise<WelcomeActionResult<unknown>>;

const GATES = [
  { id: "SIGNUP", label: "When they sign up" },
  { id: "TEAMS", label: "Before teams are made" },
  { id: "START", label: "Before the event starts" },
];
const MODES = [
  { id: "STANDARD", label: "Follow the setup steps" },
  { id: "OFF", label: "Start whenever I like" },
];
/** Channels whose names Discord turns into lower-case-with-hyphens; the category and the roles keep their spaces and capitals. */
const SPACED = new Set(["category", "participantRole", "organiserRole", "teamRole"]);
const EXAMPLE = { event: "Christmas Bingo", team: "Red Team", player: "Zezima" };

/** How a pattern comes out for an example event, the way Discord shows it. */
export function previewName(key: string, pattern: string): string {
  const filled = pattern.replaceAll("{event}", EXAMPLE.event).replaceAll("{team}", EXAMPLE.team).replaceAll("{player}", EXAMPLE.player).trim();
  if (SPACED.has(key)) return filled.slice(0, 100);
  return filled
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 100);
}

function labelOf(list: { id: string; label: string }[], id: string): string {
  return list.find((x) => x.id === id)?.label ?? id;
}

export function EventDefaultsCard({ initial, call }: { initial: EventDefaultsView; call: Call }) {
  const [view, setView] = useState(initial);
  const [names, setNames] = useState<Record<string, string>>(() => Object.fromEntries(initial.names.map((n) => [n.key, n.pattern])));
  const [look, setLook] = useState(initial.defaults.look ?? "");
  const [gate, setGate] = useState(initial.defaults.gate ?? "");
  const [mode, setMode] = useState(initial.defaults.setupMode ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "success"; title: string; items?: string[] } | null>(null);

  const changedNames = view.names.filter((n) => n.pattern.trim() !== "").length;
  const changed = changedNames + (view.defaults.look ? 1 : 0) + (view.defaults.gate ? 1 : 0) + (view.defaults.setupMode ? 1 : 0);

  async function save() {
    setBusy(true);
    setNotice(null);
    const result = await call("PUT", "events/defaults", { names, look: look || null, gate: gate || null, setupMode: mode || null });
    setBusy(false);
    if (!result.ok) {
      setNotice({ tone: "error", title: result.error, items: result.problems });
      return;
    }
    const next = result.data as EventDefaultsView;
    setView(next);
    setNames(Object.fromEntries(next.names.map((n) => [n.key, n.pattern])));
    setNotice({ tone: "success", title: "Saved. New events start from these; events you already have don't change." });
  }

  return (
    <CollapsibleCard
      id="event-defaults"
      title="Event defaults"
      hint="Where every new event starts: channel and role names, the bingo look, verification and the setup steps. Events you already have keep their own settings."
      summary={changed === 0 ? <Chip>Built-in defaults</Chip> : <Chip tone="good">{changed} changed</Chip>}
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Bingo look" hint={`Built in: ${labelOf(view.looks, view.builtIn.look)}`} size="full">
            <select className={inputClass} value={look} onChange={(e) => setLook(e.target.value)}>
              <option value="">Built in ({labelOf(view.looks, view.builtIn.look)})</option>
              {view.looks.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Must be verified by" hint="Only when an event asks for verification." size="full">
            <select className={inputClass} value={gate} onChange={(e) => setGate(e.target.value)}>
              <option value="">Built in ({labelOf(GATES, view.builtIn.gate)})</option>
              {GATES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Setup steps" hint="Events made with /events create always start whenever you like." size="full">
            <select className={inputClass} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="">Built in ({labelOf(MODES, view.builtIn.setupMode)})</option>
              {MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Channel and role names</h3>
          <p className="mt-1 text-xs text-muted">
            {"{event}"} is the event&apos;s name, {"{team}"} a team&apos;s and {"{player}"} a player&apos;s. Leave a box empty for the built-in name. Shown for an event called &quot;{EXAMPLE.event}&quot;.
          </p>
          <div className="mt-3 space-y-2">
            {view.names.map((n) => {
              const value = names[n.key] ?? "";
              return (
                <div key={n.key} className="grid items-center gap-2 sm:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1fr)]">
                  <span className="text-sm">{n.label}</span>
                  <input className={inputClass} value={value} maxLength={100} placeholder={n.builtIn} aria-label={`${n.label} name`} onChange={(e) => setNames({ ...names, [n.key]: e.target.value })} />
                  <code className="truncate text-xs text-muted">{previewName(n.key, value.trim() || n.builtIn)}</code>
                </div>
              );
            })}
          </div>
        </div>

        {notice && <Notice tone={notice.tone} title={notice.title} items={notice.items} />}
        <button type="button" className={primaryButton} disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save event defaults"}
        </button>
      </div>
    </CollapsibleCard>
  );
}
