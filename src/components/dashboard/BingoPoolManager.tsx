"use client";

import { useMemo, useState, useTransition } from "react";
import { dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import type { BingoPoolOverview, BingoPoolTile, BingoPoolTileInput, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Result = Promise<WelcomeActionResult<BingoPoolOverview>>;
type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

export interface BingoPoolActions {
  add: (tile: BingoPoolTileInput) => Result;
  save: (id: string, tile: BingoPoolTileInput) => Result;
  remove: (id: string) => Result;
  seed: (pack: string, difficulties: string[]) => Result;
  clear: (pack: string | null) => Result;
}

const tagsText = (tags: string[]) => tags.join(", ");
const tagsOf = (text: string) => text.split(",").map((t) => t.trim()).filter(Boolean);

/**
 * A server's own bingo tiles: add, edit, switch on or off and remove tiles (each with points, how many times, a difficulty and tags), and add starter packs made
 * from public wiki content. Nothing is used until a bingo event is made with "Your tile pool", and that event keeps its own copy, so changing the pool here never
 * changes an event that already exists.
 */
export function BingoPoolManager({ initial, actions }: { initial: BingoPoolOverview; actions: BingoPoolActions }) {
  const [pool, setPool] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [newTile, setNewTile] = useState({ label: "", points: "", target: "1", difficulty: "medium", tags: "" });
  const [packDifficulties, setPackDifficulties] = useState<string[]>([]);

  const difficultyLabel = (key: string) => pool.difficulties.find((d) => d.key === key)?.label ?? key;
  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return pool.tiles.filter((t) => (!difficultyFilter || t.difficulty === difficultyFilter) && (!needle || t.label.toLowerCase().includes(needle) || t.tags.some((g) => g.includes(needle))));
  }, [pool.tiles, filter, difficultyFilter]);
  const enabledCount = pool.tiles.filter((t) => t.enabled).length;

  function run(work: () => Result, success?: (data: BingoPoolOverview) => string, then?: () => void) {
    setOutcome(null);
    start(async () => {
      const r = await work();
      if (!r.ok) return setOutcome({ tone: "error", title: r.error, items: r.problems });
      setPool(r.data);
      if (success) setOutcome({ tone: "success", title: success(r.data) });
      then?.();
    });
  }

  function addTile() {
    const points = newTile.points.trim() === "" ? undefined : Number(newTile.points);
    run(
      () => actions.add({ label: newTile.label, points, target: Number(newTile.target) || 1, difficulty: newTile.difficulty, tags: tagsOf(newTile.tags), enabled: true }),
      () => "Tile added.",
      () => setNewTile((t) => ({ ...t, label: "", points: "", tags: "" })),
    );
  }

  return (
    <div className="space-y-6">
      <CollapsibleCard
        id="bingo-pool-add"
        title="Add a tile"
        hint="One thing a player has to do. Leave the points empty to use the difficulty's usual points."
        defaultOpen={pool.tiles.length === 0}
        summary={<Chip>{pool.tiles.length} of {pool.maxTiles}</Chip>}
        info={`The pool is empty until you add tiles, and nothing uses it until you make a bingo event with "Your tile pool". An event takes a copy of the enabled tiles when it is made (up to ${pool.maxTilesInEvent}).`}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Tile" hint={`Up to ${pool.maxLabel} characters.`}>
            <input className={inputClass} value={newTile.label} maxLength={pool.maxLabel} onChange={(e) => setNewTile({ ...newTile, label: e.target.value })} placeholder="Kill Nex 5 times" />
          </FormField>
          <FormField label="Difficulty">
            <select className={inputClass} value={newTile.difficulty} onChange={(e) => setNewTile({ ...newTile, difficulty: e.target.value })}>
              {pool.difficulties.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label} ({d.defaultPoints} points)
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Points" hint="Empty = the difficulty's points.">
            <input className={inputClass} inputMode="numeric" value={newTile.points} onChange={(e) => setNewTile({ ...newTile, points: e.target.value.replace(/[^0-9]/g, "") })} />
          </FormField>
          <FormField label="How many times">
            <input className={inputClass} inputMode="numeric" value={newTile.target} onChange={(e) => setNewTile({ ...newTile, target: e.target.value.replace(/[^0-9]/g, "") })} />
          </FormField>
          <FormField label="Tags" hint={`Separate with commas, up to ${pool.maxTags}. Tags only help you find tiles.`}>
            <input className={inputClass} value={newTile.tags} onChange={(e) => setNewTile({ ...newTile, tags: e.target.value })} placeholder="pvm, boss" />
          </FormField>
        </div>
        <button type="button" className={primaryButton} disabled={pending || newTile.label.trim() === "" || pool.tiles.length >= pool.maxTiles} onClick={addTile}>
          {pending ? "Working…" : "Add tile"}
        </button>
      </CollapsibleCard>

      <CollapsibleCard
        id="bingo-pool-packs"
        title="Start from the wiki"
        hint="Adds ready-made tiles from public RuneScape Wiki content. Tiles you already have are left exactly as they are."
        summary={<Chip>{pool.packs.length} packs</Chip>}
      >
        <FormField label="Only these difficulties" as="group" hint="Leave all unticked to add every tile of the pack.">
          <div className="flex flex-wrap gap-3 text-sm">
            {pool.difficulties.map((d) => (
              <label key={d.key} className="flex items-center gap-1.5">
                <input type="checkbox" checked={packDifficulties.includes(d.key)} onChange={(e) => setPackDifficulties((cur) => (e.target.checked ? [...cur, d.key] : cur.filter((x) => x !== d.key)))} />
                {d.label}
              </label>
            ))}
          </div>
        </FormField>
        <ul className="space-y-2">
          {pool.packs.map((pack) => (
            <li key={pack.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-surface-border px-4 py-3 text-sm">
              <span className="min-w-0 flex-1 basis-64">
                <span className="block font-medium">{pack.title}</span>
                <span className="block text-xs text-muted">{pack.description}</span>
              </span>
              <button
                type="button"
                className={ghostButton}
                disabled={pending}
                onClick={() => run(() => actions.seed(pack.id, packDifficulties), (d) => `Added ${d.added ?? 0} tiles${d.skipped ? ` (${d.skipped} were already there or didn't fit)` : ""}.`)}
              >
                Add this pack
              </button>
              <button type="button" className={dangerButton} disabled={pending || !pool.tiles.some((t) => t.source === pack.id)} onClick={() => run(() => actions.clear(pack.id), (d) => `Removed ${d.removed ?? 0} tiles.`)}>
                Remove its tiles
              </button>
            </li>
          ))}
        </ul>
      </CollapsibleCard>

      {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}

      <section aria-labelledby="bingo-pool-list" className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 border-b border-surface-border pb-1">
          <h2 id="bingo-pool-list" className="text-lg font-semibold text-gold">
            Your tiles
          </h2>
          <Chip tone="good">{enabledCount} on</Chip>
          <Chip>{pool.tiles.length - enabledCount} off</Chip>
          <span className="flex-1" />
          <input aria-label="Search tiles" className={`${inputClass} max-w-48`} placeholder="Search…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <select aria-label="Show a difficulty" className={`${inputClass} max-w-40`} value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
            <option value="">Every difficulty</option>
            {pool.difficulties.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        {pool.tiles.length === 0 ? (
          <p className="text-sm text-muted">No tiles yet. Add one above, or start from a wiki pack.</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted">No tile matches.</p>
        ) : (
          <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface">
            {shown.slice(0, 200).map((tile) => (
              <TileRow key={`${tile.id}-${tile.label}-${tile.points}-${tile.target}-${tile.difficulty}-${tile.enabled}-${tagsText(tile.tags)}`} tile={tile} pool={pool} difficultyLabel={difficultyLabel} busy={pending} onSave={(t) => run(() => actions.save(tile.id, t))} onRemove={() => run(() => actions.remove(tile.id))} />
            ))}
          </ul>
        )}
        {shown.length > 200 && <p className="text-xs text-muted">Showing the first 200 of {shown.length}. Search to narrow it down.</p>}
        {pool.tiles.length > 0 && (
          <div>
            <button type="button" className={dangerButton} disabled={pending} onClick={() => window.confirm("Remove every tile from your pool?") && run(() => actions.clear(null), (d) => `Removed ${d.removed ?? 0} tiles.`)}>
              Empty the pool
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function TileRow({
  tile,
  pool,
  difficultyLabel,
  busy,
  onSave,
  onRemove,
}: {
  tile: BingoPoolTile;
  pool: BingoPoolOverview;
  difficultyLabel: (key: string) => string;
  busy: boolean;
  onSave: (tile: BingoPoolTileInput) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ label: tile.label, points: String(tile.points), target: String(tile.target), difficulty: tile.difficulty, tags: tagsText(tile.tags) });

  if (!editing) {
    return (
      <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
        <input type="checkbox" aria-label={`Use ${tile.label}`} checked={tile.enabled} disabled={busy} onChange={(e) => onSave({ label: tile.label, enabled: e.target.checked })} />
        <span className={`min-w-0 flex-1 basis-56 ${tile.enabled ? "" : "text-muted line-through"}`}>{tile.label}</span>
        <Chip>{difficultyLabel(tile.difficulty)}</Chip>
        <span className="text-xs text-muted tabular-nums">
          {tile.points} pts{tile.target > 1 ? ` × ${tile.target}` : ""}
        </span>
        {tile.tags.map((g) => (
          <span key={g} className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-muted">
            {g}
          </span>
        ))}
        <button type="button" className={ghostButton} disabled={busy} onClick={() => setEditing(true)}>
          Edit
        </button>
      </li>
    );
  }

  return (
    <li className="space-y-3 px-4 py-3 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Tile">
          <input className={inputClass} value={draft.label} maxLength={pool.maxLabel} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        </FormField>
        <FormField label="Difficulty">
          <select className={inputClass} value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })}>
            {pool.difficulties.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Points">
          <input className={inputClass} inputMode="numeric" value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value.replace(/[^0-9]/g, "") })} />
        </FormField>
        <FormField label="How many times">
          <input className={inputClass} inputMode="numeric" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value.replace(/[^0-9]/g, "") })} />
        </FormField>
        <FormField label="Tags">
          <input className={inputClass} value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
        </FormField>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButton}
          disabled={busy || draft.label.trim() === ""}
          onClick={() => {
            onSave({ label: draft.label, points: Number(draft.points) || 0, target: Number(draft.target) || 1, difficulty: draft.difficulty, tags: tagsOf(draft.tags) });
            setEditing(false);
          }}
        >
          Save
        </button>
        <button type="button" className={ghostButton} onClick={() => setEditing(false)}>
          Cancel
        </button>
        <button type="button" className={`${dangerButton} ml-auto`} disabled={busy} onClick={onRemove}>
          Remove tile
        </button>
      </div>
    </li>
  );
}
