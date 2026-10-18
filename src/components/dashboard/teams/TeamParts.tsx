"use client";

import { ghostButton, StatusBadge } from "@/components/admin/ui";
import { MAX_RATING, ratingOf, ratingSource, shortXp } from "@/lib/eventTeams";
import type { EventPlayer } from "@/lib/eventTypes";

const KIND_LABEL = { HOME_CLAN: "Clan member", HOME_OTHER: "This server", PARTNER: "Other server" } as const;

/**
 * Five stars for how strong a player is. Gold and solid when an organiser rated them, gold and faint when the rating is worked out from their stats, grey when
 * nothing is known (they count as average). Pressing a star sets that rating; pressing the one already set clears it.
 */
export function Stars({ player, onRate, disabled }: { player: EventPlayer; onRate: (rating: number | null) => void; disabled: boolean }) {
  const source = ratingSource(player);
  const shown = ratingOf(player);
  const hint = source === "set" ? "Rated by an organiser" : source === "suggested" ? "Worked out from their stats" : "Not rated and no stats: counts as average";
  return (
    <span className="flex shrink-0 items-center" title={hint} role="group" aria-label={`Strength: ${shown} out of ${MAX_RATING}. ${hint}.`}>
      {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          aria-label={n === player.rating ? `Clear the rating of ${n}` : `Rate ${n} out of ${MAX_RATING}`}
          aria-pressed={n <= shown}
          onClick={() => onRate(n === player.rating ? null : n)}
          className={`px-0.5 text-base leading-none transition disabled:cursor-default ${
            n <= shown ? (source === "set" ? "text-gold" : source === "suggested" ? "text-gold/55" : "text-muted") : "text-surface-border hover:text-gold/60"
          }`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

/** What is known about a player's account in a line: combat level, total level and XP, or why nothing is. */
export function strengthLine(player: EventPlayer): string {
  const s = player.strength;
  if (!s) return "No stats: no RuneScape name linked, or not read yet";
  return `Combat ${s.combatLevel} · Total ${s.totalLevel.toLocaleString("en-GB")} · ${shortXp(s.totalXp)} XP`;
}

/** One player in the builder: who they are, how strong, and what can be done with them. Drag it to a team, or use the Move list (which also works on a phone). */
export function PlayerCard({
  player,
  teams,
  teamId,
  isCaptain,
  proposedTeam,
  busy,
  locked,
  onMove,
  onRate,
  onCaptain,
  onVerify,
  dragging,
  dragEnabled,
}: {
  player: EventPlayer;
  teams: { id: string; name: string }[];
  teamId: string | null;
  isCaptain: boolean;
  proposedTeam: string | null;
  busy: boolean;
  /** The event is over: nothing can be changed. */
  locked: boolean;
  onMove: (teamId: string | null) => void;
  onRate: (rating: number | null) => void;
  onCaptain?: () => void;
  /** Present for a player who can't be put on a team: the two ways through verification. */
  onVerify?: (state: "verified" | "waived") => void;
  /** This card is being dragged right now. */
  dragging: boolean;
  /** Drag and drop is switched on: the card can be picked up (the team builder does the dragging, this only marks the card and shows the grip). */
  dragEnabled: boolean;
}) {
  const name = player.userName ?? `Player ${player.userId}`;
  // a bot older than the team builder doesn't send these, which reads as "nothing in the way"
  const block = player.teamBlock ?? null;
  const canDrag = !locked && !busy && block === null && dragEnabled;
  return (
    <li
      data-player-id={canDrag ? player.userId : undefined}
      className={`space-y-1.5 rounded-lg border bg-background p-2.5 text-sm transition ${canDrag ? "cursor-grab select-none active:cursor-grabbing" : ""} ${
        dragging ? "opacity-40" : ""
      } ${block !== null ? "border-amber-500/40" : proposedTeam ? "border-dashed border-gold/70" : "border-surface-border"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-medium">
            {canDrag && (
              <span data-grip className="-ml-1 touch-none px-0.5 text-muted" title="Drag to a team" aria-hidden>
                ⠿
              </span>
            )}
            <span className="truncate">{name}</span>
            {isCaptain && (
              <span title="Captain" className="text-gold" aria-label="Captain">
                ♛
              </span>
            )}
          </p>
          <p className="text-xs text-muted" title={player.strength ? `RuneScape name: ${player.strength.rsn}` : undefined}>
            {KIND_LABEL[player.kind]} · {strengthLine(player)}
          </p>
        </div>
        <Stars player={player} onRate={onRate} disabled={locked || busy} />
      </div>
      {block !== null && (
        <div className="space-y-1">
          {/* the bot's sentence ends by naming the two ways through, which are the two buttons right here */}
          <p className="text-xs text-amber-300">{block.replace(/ Verify or waive them first\.$/, "")}</p>
          {onVerify && !locked && (
            <span className="flex flex-wrap gap-2">
              <button type="button" className="text-xs text-gold underline disabled:opacity-40" disabled={busy} onClick={() => onVerify("verified")}>
                Verify
              </button>
              <button type="button" className="text-xs text-gold underline disabled:opacity-40" disabled={busy} title="Let them through without proof" onClick={() => onVerify("waived")}>
                Let them through
              </button>
            </span>
          )}
        </div>
      )}
      {proposedTeam && (
        <p className="flex items-center gap-1 text-xs text-gold">
          <StatusBadge tone="warn">Suggested</StatusBadge> {proposedTeam}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {block === null || teamId !== null ? (
          <select
            aria-label={`Move ${name} to a team`}
            className="max-w-[10rem] rounded-md border border-surface-border bg-background px-2 py-1 text-xs outline-none focus:border-gold disabled:opacity-50"
            disabled={locked || busy}
            value={teamId ?? ""}
            onChange={(ev) => onMove(ev.target.value || null)}
          >
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        ) : null}
        {onCaptain && !locked && (
          <button type="button" className={`${ghostButton} px-2! py-0.5! text-xs!`} disabled={busy} onClick={onCaptain}>
            {isCaptain ? "Not captain" : "Make captain"}
          </button>
        )}
      </div>
    </li>
  );
}
