"use client";

import { confirmDialog } from "@/components/ui/Dialogs";
import Link from "next/link";
import { useState, useTransition } from "react";
import { formatUtc, Notice, StatusBadge } from "@/components/admin/ui";
import { EventStreams, type DraftList, type TemplateList } from "@/components/dashboard/setup/EventStreams";
import type { EventKind } from "@/lib/eventOptions";
import type { EventList, EventStatus } from "@/lib/eventTypes";
import type { GuildStructure, WelcomeActionResult } from "@/lib/jonnybot-admin";

export type EventCall = (method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown) => Promise<WelcomeActionResult<unknown>>;

const TONE: Record<EventStatus, "good" | "muted" | "warn"> = { DRAFT: "muted", SIGNUPS: "warn", RUNNING: "good", SCORING: "warn", DONE: "muted", CANCELLED: "muted" };
export const STAGE_LABEL: Record<EventStatus, string> = { DRAFT: "Draft", SIGNUPS: "Signups open", RUNNING: "Running", SCORING: "Scoring", DONE: "Done", CANCELLED: "Cancelled" };

/** The server's events, and the ways to start a new one (standard, quick or guided setup, unfinished setups and saved templates). */
export function EventListView({
  initial,
  kinds,
  drafts,
  templates,
  structure,
  guildId,
  call,
}: {
  initial: EventList;
  kinds: EventKind[];
  drafts: DraftList;
  templates: TemplateList;
  structure: GuildStructure;
  guildId: string;
  call: EventCall;
}) {
  const [events, setEvents] = useState(initial.events);
  const [showArchived, setShowArchived] = useState(false);
  const [listProblem, setListProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [listPending, startList] = useTransition();

  const finished = (s: EventStatus) => s === "DONE" || s === "CANCELLED";
  const shown = events.filter((e) => showArchived || !e.archived);
  const archivedCount = events.filter((e) => e.archived).length;
  const toArchive = events.filter((e) => finished(e.status) && !e.archived).length;

  /** Runs one list action (archive, bring back, delete) and shows the list the bot answers with. */
  function listAction(method: "POST" | "DELETE", path: string, body?: unknown) {
    setListProblem(null);
    startList(async () => {
      const result = await call(method, path, body ?? {});
      if (!result.ok) return setListProblem({ title: result.error, items: result.problems });
      setEvents((result.data as EventList).events);
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gold">Your events</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {toArchive > 0 && (
              <button type="button" className="text-gold underline" disabled={listPending} onClick={() => listAction("POST", "events/archive-finished")}>
                Archive {toArchive} finished {toArchive === 1 ? "event" : "events"}
              </button>
            )}
            {archivedCount > 0 && (
              <label className="flex items-center gap-2 text-muted">
                <input type="checkbox" checked={showArchived} onChange={(ev) => setShowArchived(ev.target.checked)} />
                Show archived ({archivedCount})
              </label>
            )}
          </div>
        </div>
        {listProblem && <Notice tone="error" title={listProblem.title} items={listProblem.items} />}
        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">
            {events.length === 0 ? "No events yet. Start one below." : "Nothing here. Finished events you archived are hidden."}
          </p>
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {shown.map((e) => (
              <li key={e.id} className={`flex flex-col rounded-xl border border-surface-border bg-surface transition hover:border-gold/60 ${e.archived ? "opacity-60" : ""}`}>
                <Link href={`/dashboard/${guildId}/event-manager/${e.id}`} className="flex h-full flex-col gap-2 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold break-words">{e.name}</span>
                    <StatusBadge tone={TONE[e.status]}>{STAGE_LABEL[e.status]}</StatusBadge>
                  </div>
                  <p className="text-xs text-muted">
                    {e.scoringMode === "TEAM" ? "Teams" : "Solo players"} · {e.scope === "PRIVATE" ? "Clan only" : e.scope === "ALLIANCE" ? "Allies" : "Public"}
                    {e.maxParticipants ? ` · up to ${e.maxParticipants} players` : ""} · created {formatUtc(e.createdAt)}
                  </p>
                  {e.description && <p className="line-clamp-2 break-words text-sm text-muted">{e.description}</p>}
                </Link>
                {(finished(e.status) || e.status === "DRAFT") && (
                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-surface-border px-5 py-2 text-xs">
                    {finished(e.status) && (
                      <button type="button" className="text-gold underline" disabled={listPending} onClick={() => listAction("POST", `events/${e.id}/archive`, { archived: !e.archived })}>
                        {e.archived ? "Bring back" : "Archive"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-red-400 underline"
                      disabled={listPending}
                      onClick={async () =>
                        (await confirmDialog({ title: `Delete "${e.name}" for good?`, body: "Its players, progress, proof and prizes go with it. Clan points already paid stay in the points history.", confirmLabel: "Delete event", tone: "danger" })) && listAction("DELETE", `events/${e.id}`)
                      }
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">A server can have up to {initial.maxOpen} unfinished events at once.</p>
      </section>

      <EventStreams guildId={guildId} kinds={kinds} initialDrafts={drafts} initialTemplates={templates} structure={structure} call={call} />
    </div>
  );
}
