"use client";

import { dangerButton, ghostButton, inputClass } from "@/components/admin/ui";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Advanced, MoreInAdvanced } from "@/components/dashboard/ui/ViewMode";
import type { EventObjective } from "@/lib/eventTypes";
import type { TileHint } from "@/lib/jonnybot-admin";
import { useEffect, useState } from "react";

const EVIDENCE: { value: EventObjective["evidence"]; label: string }[] = [
  { value: "EITHER", label: "Proof or automatic" },
  { value: "PROOF", label: "Proof only" },
  { value: "AUTO", label: "Automatic only" },
  { value: "ORGANISER", label: "Organiser only" },
];

/** The same columns for the heading row and every objective, so the labels sit over the numbers they name. */
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem_11rem_5.5rem]";

const num = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(/[, ]/g, "")) || 0);

export type TileHintsCall = (template: string, labels: string[]) => Promise<{ ok: true; data: TileHint[] } | { ok: false; error: string }>;

/** Templates whose objective labels RuneSync can never tick (they score kills or totals instead). */
const NO_HINTS = new Set(["competition", "boss-night"]);

/**
 * "Auto with RuneSync" hints for the labels being typed (T-141): asked about 0.6 s after typing stops, for every label at once, and kept by label
 * so a hint stays put while its row is edited elsewhere. A failed request leaves the last hints in place (the hints are only a help).
 */
/** The hint under one label. A tile set to proof or organiser only never ticks by itself, so it says that instead of promising it. */
function TileHintLine({ hint, evidence }: { hint: TileHint | undefined; evidence: EventObjective["evidence"] }) {
  if (!hint?.text) return null;
  const blocked = hint.auto && (evidence === "PROOF" || evidence === "ORGANISER");
  const text = blocked ? "RuneSync could tick this, but How it's proven doesn't allow automatic progress." : hint.text;
  return <p className={`text-xs ${hint.auto && !blocked ? "text-emerald-300" : "text-muted"}`}>{text}</p>;
}

function useTileHints(objectives: EventObjective[], template: string | undefined, hints: TileHintsCall | undefined): Record<string, TileHint> {
  const [byLabel, setByLabel] = useState<Record<string, TileHint>>({});
  const labelsKey = JSON.stringify([...new Set(objectives.map((o) => o.label.trim()).filter(Boolean))].sort());
  useEffect(() => {
    if (!hints || !template || NO_HINTS.has(template)) return;
    const labels: string[] = JSON.parse(labelsKey);
    if (labels.length === 0) return;
    let live = true;
    const timer = setTimeout(() => {
      void hints(template, labels).then((result) => {
        if (live && result.ok) setByLabel(Object.fromEntries(result.data.map((h) => [h.label, h])));
      });
    }, 600);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [labelsKey, template, hints]);
  return byLabel;
}

/**
 * What players can score, as a list with its columns named once at the top (Points, Needed, Times, How it's proven) instead of numbers with no label. The basic
 * view is the title and those columns; the description, what has to be done first and the key are in the Advanced view. A bar at the bottom keeps the save
 * button in view and says when there are changes that are not saved.
 */
export function ObjectivesTab({
  objectives,
  saved,
  onChange,
  editable,
  pending,
  onSave,
  onAdd,
  template,
  hints,
}: {
  objectives: EventObjective[];
  saved: EventObjective[];
  onChange: (next: EventObjective[]) => void;
  editable: boolean;
  pending: boolean;
  onSave: () => void;
  onAdd: () => void;
  /** The event's template key; hints are only asked for templates whose tiles RuneSync can tick (not competitions or boss nights). */
  template?: string;
  /** Asks the bot whether RuneSync can tick each label by itself (T-141). Without it no hints are shown. */
  hints?: TileHintsCall;
}) {
  const dirty = JSON.stringify(objectives) !== JSON.stringify(saved);
  const set = (i: number, patch: Partial<EventObjective>) => onChange(objectives.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const tileHints = useTileHints(objectives, template, hints);

  return (
    <section className="space-y-4">
      <div className="max-w-3xl space-y-1 text-sm text-muted">
        <p>Each objective is something a player or team can complete for points: a bingo tile, a boss kill, a step. An organiser can always record progress by hand.</p>
        <p>
          <strong className="font-medium text-foreground">Needed</strong> is how many it takes to complete it (25 kills), and <strong className="font-medium text-foreground">Times</strong> is how many times
          it can count.
        </p>
      </div>

      {objectives.length === 0 && (
        <div className="rounded-xl border border-dashed border-surface-border p-6 text-center">
          <p className="font-medium">No objectives yet</p>
          <p className="mt-1 text-sm text-muted">Add the first thing players can score for. You can add as many as you like.</p>
          {editable && (
            <button type="button" className="mt-3 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110" onClick={onAdd}>
              Add an objective
            </button>
          )}
        </div>
      )}

      {objectives.length > 0 && (
        <div className="space-y-2">
          <div aria-hidden className={`hidden gap-2 px-4 text-xs font-semibold tracking-wide text-muted uppercase md:grid ${COLUMNS}`}>
            <span>Objective</span>
            <span>Points</span>
            <span>Needed</span>
            <span>Times</span>
            <span>How it&apos;s proven</span>
            <span />
          </div>
          <ul className="space-y-2">
            {objectives.map((o, i) => (
              <li key={i} className="space-y-2 rounded-xl border border-surface-border bg-surface p-4">
                <div className={`grid items-start gap-2 ${COLUMNS}`}>
                  <div className="space-y-1">
                    <input className={inputClass} disabled={!editable} aria-label={`Objective ${i + 1}: title`} placeholder="What players do" value={o.label} onChange={(ev) => set(i, { label: ev.target.value })} />
                    <TileHintLine hint={tileHints[o.label.trim()]} evidence={o.evidence} />
                  </div>
                  <label className="text-xs text-muted md:text-[0px]">
                    <span className="md:sr-only">Points</span>
                    <input className={inputClass} disabled={!editable} inputMode="numeric" value={o.points} onChange={(ev) => set(i, { points: num(ev.target.value) })} />
                  </label>
                  <label className="text-xs text-muted md:text-[0px]">
                    <span className="md:sr-only">Needed</span>
                    <input className={inputClass} disabled={!editable} inputMode="numeric" value={o.target} onChange={(ev) => set(i, { target: num(ev.target.value) })} />
                  </label>
                  <label className="text-xs text-muted md:text-[0px]">
                    <span className="md:sr-only">Times it counts</span>
                    <input className={inputClass} disabled={!editable} inputMode="numeric" value={o.repeatLimit} onChange={(ev) => set(i, { repeatLimit: num(ev.target.value) })} />
                  </label>
                  <label className="text-xs text-muted md:text-[0px]">
                    <span className="md:sr-only">How it is proven</span>
                    <select className={inputClass} disabled={!editable} value={o.evidence} onChange={(ev) => set(i, { evidence: ev.target.value as EventObjective["evidence"] })}>
                      {EVIDENCE.map((x) => (
                        <option key={x.value} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {editable ? (
                    <button type="button" className={`${dangerButton} md:justify-self-end`} onClick={() => onChange(objectives.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
                <Advanced>
                  <div className="grid gap-2 border-t border-surface-border pt-3 md:grid-cols-2">
                    <label className="text-xs text-muted">
                      Description (optional)
                      <input className={`${inputClass} mt-1`} disabled={!editable} value={o.description} onChange={(ev) => set(i, { description: ev.target.value })} />
                    </label>
                    <label className="text-xs text-muted">
                      Needs these done first (keys, comma separated)
                      <input
                        className={`${inputClass} mt-1`}
                        disabled={!editable}
                        value={o.prerequisites.join(", ")}
                        onChange={(ev) => set(i, { prerequisites: ev.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
                      />
                    </label>
                    <p className="text-xs text-muted md:col-span-2">Key: {o.key || "made from the title when saved"}</p>
                  </div>
                </Advanced>
              </li>
            ))}
          </ul>
          {editable && (
            <button type="button" className={ghostButton} onClick={onAdd}>
              + Add an objective
            </button>
          )}
        </div>
      )}

      <MoreInAdvanced>a description for each objective, which others have to be done first, and each one&apos;s key.</MoreInAdvanced>

      {editable && objectives.length > 0 && <SaveBar pending={pending} onSave={onSave} outcome={null} dirty={dirty} onDiscard={() => onChange(saved)} label="Save objectives" />}
    </section>
  );
}
