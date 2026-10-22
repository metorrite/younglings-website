import type { RuneSyncEvent, RuneSyncView } from "@/lib/plugin";
import { compact, shortDate } from "@/lib/site";

/** "21 Oct 2026, 14:03 UTC": fixed format, rendered on the server. */
function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${shortDate(iso)}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

const text = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** One line per event type, from the fields the bot stores (RUNESYNC-DESIGN.md section 4). */
const TYPES: { key: keyof RuneSyncView["recent"]; label: string; empty: string; line: (e: RuneSyncEvent) => string }[] = [
  {
    key: "XP",
    label: "Last XP syncs",
    empty: "No XP synced yet.",
    line: (e) => {
      const xp = num(e.data.xpScaled) ?? num(e.data.xp);
      return `${text(e.data.skill) || "A skill"}: ${xp === null ? "?" : compact(xp)} XP${num(e.data.level) !== null ? ` (level ${e.data.level})` : ""}`;
    },
  },
  {
    key: "DROP",
    label: "Drops",
    empty: "No drops reported yet.",
    line: (e) => {
      const qty = num(e.data.quantity);
      const value = num(e.data.valueGp);
      const from = e.sourceName ? ` from ${e.sourceName}` : "";
      return `${qty !== null && qty > 1 ? `${compact(qty)} × ` : ""}${text(e.data.itemName) || "An item"}${from}${value !== null ? ` · ${compact(value)} gp` : ""}`;
    },
  },
  { key: "KILL", label: "Boss kills", empty: "No boss kills reported yet.", line: (e) => `${text(e.data.bossName) || "A boss"}${num(e.data.killCount) !== null ? `: kill ${e.data.killCount}` : ""}` },
  { key: "CLUE", label: "Clue scrolls", empty: "No clue scrolls reported yet.", line: (e) => `${text(e.data.tier) || "A"} clue${num(e.data.count) !== null ? `: ${e.data.count} completed` : ""}` },
];

/**
 * The member's own RuneSync activity on the profile's Plugin tab (T-202): their client (version, last seen, last batch, paused), their
 * latest 50 events of each type, and the diagnostics ids they made in game for a bug report. Read-only; consent lives in the panel above.
 */
export function RuneSyncActivity({ view }: { view: RuneSyncView }) {
  const c = view.client;
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-surface-border bg-surface p-5">
        <h2 className="font-semibold text-gold">Your game client</h2>
        {c ? (
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Plugin</dt>
              <dd>{c.client ?? "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Last seen</dt>
              <dd>{when(c.lastSeen)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Last batch</dt>
              <dd>
                {c.lastBatchAt
                  ? `${when(c.lastBatchAt)}: ${c.lastBatch.accepted} accepted, ${c.lastBatch.duplicates} already had, ${c.lastBatch.rejected} refused`
                  : "Nothing sent yet"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Sending</dt>
              <dd>{c.paused ? "Paused in the game" : "On"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted">RuneSync hasn&apos;t been in touch yet. Install it with RS Link, log in to the game, and it shows up here within a minute.</p>
        )}
        {view.minClientVersion !== "0.0.0" && <p className="mt-3 text-xs text-muted">RuneSync {view.minClientVersion} or newer is needed to send.</p>}
      </section>

      <section className="rounded-xl border border-surface-border bg-surface p-5">
        <h2 className="font-semibold text-gold">What RuneSync sent</h2>
        <p className="mt-1 text-xs text-muted">Your own latest 50 of each kind. Only categories you switched on are kept.</p>
        <div className="mt-4 space-y-2">
          {TYPES.map((t) => {
            const list = view.recent[t.key] ?? [];
            return (
              <details key={t.key} className="rounded-lg border border-surface-border/60 bg-background/40 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {t.label} <span className="text-xs text-muted">({list.length})</span>
                </summary>
                {list.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">{t.empty}</p>
                ) : (
                  <ul className="mt-2 divide-y divide-surface-border/60 text-sm">
                    {list.map((e, i) => (
                      <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                        <span className="min-w-0 break-words">{t.line(e)}</span>
                        <span className="shrink-0 text-xs text-muted">{when(e.at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-surface p-5">
        <h2 className="font-semibold text-gold">Bug-report ids</h2>
        <p className="mt-1 text-xs text-muted">
          &quot;Get diagnostics id&quot; in RuneSync&apos;s settings panel makes one. Put it in a bug report. Each is kept {view.diagnosticsKeptDays} days and never holds your link, tokens or chat.
        </p>
        {view.diagnostics.length > 0 ? (
          <ul className="mt-3 divide-y divide-surface-border/60 text-sm">
            {view.diagnostics.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span className="font-mono select-all">{d.id}</span>
                <span className="text-xs text-muted">
                  Made {when(d.createdAt)} · gone {shortDate(d.expiresAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">None yet.</p>
        )}
      </section>
    </div>
  );
}
