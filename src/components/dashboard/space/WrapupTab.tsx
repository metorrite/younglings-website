"use client";

import { useEffect, useState } from "react";
import { dangerButton, formatUtc, FormField, ghostButton, inputClass, Notice, primaryButton, StatusBadge } from "@/components/admin/ui";
import type { EventCall } from "@/components/dashboard/EventListView";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { EventDetail, WrapupSettings, WrapupView } from "@/lib/eventTypes";

type Problem = { title: string; items: string[] } | null;
type Pending = { action: "roles" | "archive" | "compress" | "delete"; title: string; body: string; deleteOriginals?: boolean; all?: boolean } | null;

const JOB_LABEL: Record<string, string> = { lock: "Locking the channels", unlock: "Unlocking the channels", roles: "Taking the roles back", archive: "Archiving", compress: "Writing the transcripts", export: "Making the export", removal: "Deleting", setup: "Setting up" };

/** "7" in the box means seven days, empty means never, and the bot stores -1 for never. */
function daysText(days: number): string {
  return days < 0 ? "" : String(days);
}

function daysFrom(text: string): number {
  const t = text.trim();
  if (t === "") return -1;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 && n <= 3650 ? n : -1;
}

/** Downloads a base64 file the bot handed over, through the browser. */
function saveFile(name: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Wrapping an event up once it is over: what happens to its channels and roles by itself, and the actions an organiser can start now (lock, take the
 * roles back, archive, compress into transcripts, export everything to a zip, delete). Every action that deletes asks first, and the bot checks every rule.
 */
export function WrapupTab({ detail, call }: { detail: EventDetail; call: EventCall }) {
  const base = `events/${detail.event.id}/wrapup`;
  const [view, setView] = useState<WrapupView | null>(null);
  const [draft, setDraft] = useState<WrapupSettings | null>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [compressAll, setCompressAll] = useState(false);
  const [deleteOriginals, setDeleteOriginals] = useState(false);

  useEffect(() => {
    let cancelled = false;
    call("GET", base).then((result) => {
      if (cancelled) return;
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      const next = result.data as WrapupView;
      setView(next);
      setDraft(next.settings);
    });
    return () => {
      cancelled = true;
    };
  }, [base, call]);

  const running = view?.job?.state === "running";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(async () => {
      const result = await call("GET", base);
      if (result.ok) setView(result.data as WrapupView);
    }, 2000);
    return () => clearInterval(timer);
  }, [running, base, call]);

  if (!view || !draft) {
    return <section>{problem ? <Notice tone="error" title={problem.title} items={problem.items} /> : <p className="text-sm text-muted">Loading the wrap-up…</p>}</section>;
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(view.settings);
  const nothingMade = view.counts.channels === 0 && view.counts.roles === 0;

  async function run(action: string, body: Record<string, unknown> = {}, done?: string) {
    setBusy(true);
    setProblem(null);
    setNote(null);
    try {
      const result = await call("POST", `${base}/${action}`, body);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setView(result.data as WrapupView);
      if (done) setNote(done);
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setProblem(null);
    setNote(null);
    try {
      const result = await call("PUT", `${base}/settings`, draft);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      const next = result.data as WrapupView;
      setView(next);
      setDraft(next.settings);
      setNote("Saved.");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setProblem(null);
    try {
      const result = await call("GET", `${base}/export/file`);
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      const file = result.data as { name: string; base64: string };
      saveFile(file.name, file.base64);
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || running;
  const over = view.over;
  const channelsLine = view.state.channelsDoneAt ? `${view.state.channelsHow ?? "dealt with"} ${formatUtc(view.state.channelsDoneAt)}` : null;

  return (
    <section className="space-y-6">
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      {view.job && (
        <div className="rounded-xl border border-surface-border bg-surface p-4 text-sm">
          <p className="font-medium">
            {JOB_LABEL[view.job.kind] ?? view.job.kind}{" "}
            <StatusBadge tone={view.job.state === "running" ? "warn" : view.job.state === "done" ? "good" : "muted"}>{view.job.state === "running" ? "Working" : view.job.state === "done" ? "Done" : "Stopped"}</StatusBadge>
          </p>
          <p className="mt-1 text-muted">{view.job.message}</p>
          {view.job.total > 0 && view.job.state === "running" && (
            <p className="mt-1 text-xs text-muted">
              {view.job.done} of {view.job.total}
            </p>
          )}
        </div>
      )}

      {!over && (
        <p className="rounded-xl border border-gold/40 p-4 text-sm text-gold">
          This event is {view.status.toLowerCase().replace("_", " ")}. Wrapping up starts when it finishes: you can choose how now, and the actions below open once it is over.
        </p>
      )}

      <div className="space-y-4 rounded-xl border border-surface-border bg-surface p-5">
        <div>
          <h3 className="font-semibold">When the event is over</h3>
          <p className="text-sm text-muted">What happens to the channels and roles JonnyBot made for it, by itself. Channels you picked yourself are never touched.</p>
        </div>
        <Toggle
          checked={draft.lockOnFinish}
          onChange={(lockOnFinish) => setDraft({ ...draft, lockOnFinish })}
          disabled={busy}
          label="Make the channels read-only"
          detail="Players can still read the channels but can't write in them. Staff and organisers can."
        />
        {draft.lockOnFinish && (
          <Toggle
            checked={draft.unlockOnReopen !== false}
            onChange={(unlockOnReopen) => setDraft({ ...draft, unlockOnReopen })}
            disabled={busy}
            label="Unlock them if the event is reopened"
            detail="When a finished event is moved back to running, players can write in its channels again."
          />
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Take the event roles back after (days)" hint="0 is straight away. Empty keeps them until you remove them. Without the roles, players lose the access they gave.">
            <input className={inputClass} inputMode="numeric" disabled={busy} value={daysText(draft.rolesDays)} placeholder="never" onChange={(e) => setDraft({ ...draft, rolesDays: daysFrom(e.target.value) })} />
          </FormField>
          <FormField label="Deal with the channels after (days)" hint="Empty leaves them until you decide.">
            <input className={inputClass} inputMode="numeric" disabled={busy} value={daysText(draft.channelsDays)} placeholder="never" onChange={(e) => setDraft({ ...draft, channelsDays: daysFrom(e.target.value) })} />
          </FormField>
        </div>
        {draft.channelsDays >= 0 && (
          <FormField label="Then the channels are" hint={draft.channelsAction === "DELETE" ? "Deleted for good. Export first if you want the messages." : "Moved into an archive only staff can see."}>
            <select className={inputClass} disabled={busy} value={draft.channelsAction} onChange={(e) => setDraft({ ...draft, channelsAction: e.target.value as WrapupSettings["channelsAction"] })}>
              <option value="ARCHIVE">Archived</option>
              <option value="DELETE">Deleted</option>
              <option value="NONE">Left alone</option>
            </select>
          </FormField>
        )}
        <div className="flex items-center gap-3">
          <button type="button" className={primaryButton} disabled={busy || !dirty} onClick={save}>
            Save
          </button>
          {dirty && (
            <button type="button" className={ghostButton} disabled={busy} onClick={() => setDraft(view.settings)}>
              Undo changes
            </button>
          )}
        </div>
        <ul className="space-y-1 text-xs text-muted">
          <li>
            Channels read-only: {view.state.lockedAt ? `done ${formatUtc(view.state.lockedAt)}` : view.schedule.lockAt ? `when the event finishes` : draft.lockOnFinish ? "when the event finishes" : "not planned"}
          </li>
          <li>Roles taken back: {view.state.rolesRemovedAt ? `done ${formatUtc(view.state.rolesRemovedAt)}` : view.schedule.rolesAt ? `planned for ${formatUtc(view.schedule.rolesAt)}` : "not planned"}</li>
          <li>Channels: {channelsLine ?? (view.schedule.channelsAt ? `planned for ${formatUtc(view.schedule.channelsAt)}` : "left until you decide")}</li>
        </ul>
      </div>

      <div className="space-y-4 rounded-xl border border-surface-border bg-surface p-5">
        <div>
          <h3 className="font-semibold">Do it now</h3>
          <p className="text-sm text-muted">
            {nothingMade ? "JonnyBot made no roles or channels for this event, so there is nothing to tidy; you can still export what the bot knows." : `JonnyBot made ${view.counts.channels} channels (${view.counts.categories} categories) and ${view.counts.roles} roles for this event.`}
          </p>
        </div>

        <ul className="divide-y divide-surface-border/60 text-sm">
          <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="font-medium">Export everything</span>
              <span className="block text-xs text-muted">One zip: the event&apos;s data (with spreadsheet files of the players, standings and proof sent), every channel&apos;s messages (the bot&apos;s duplicate receipts folded into one), and the images that fit. Discord&apos;s own image links expire, so do this before deleting.</span>
              {view.export && (
                <span className="block text-xs text-muted">
                  Ready: {view.export.messages} messages, {view.export.images} images{view.export.links > 0 ? `, ${view.export.links} more as links` : ""} ({(view.export.size / 1024 / 1024).toFixed(1)} MB). Kept for an hour.
                </span>
              )}
              {view.state.exportedAt && <span className="block text-xs text-muted">Last exported {formatUtc(view.state.exportedAt)}.</span>}
            </span>
            <span className="flex gap-2">
              <button type="button" className={ghostButton} disabled={disabled || !over} onClick={() => run("export", {}, "Making the export. It takes a moment.")}>
                Make export
              </button>
              {view.export && (
                <button type="button" className={primaryButton} disabled={busy} onClick={download}>
                  Download
                </button>
              )}
            </span>
          </li>

          <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="font-medium">Make the channels read-only</span>
              <span className="block text-xs text-muted">Players can read but not write. {view.state.lockedAt ? `Done ${formatUtc(view.state.lockedAt)}.` : ""}</span>
            </span>
            <span className="flex gap-2">
              <button type="button" className={ghostButton} disabled={disabled || !over || view.counts.channels === 0} onClick={() => run("lock", {}, "Locking the channels.")}>
                Lock
              </button>
              <button type="button" className={ghostButton} disabled={disabled || view.counts.channels === 0} onClick={() => run("unlock", {}, "Unlocking the channels.")}>
                Unlock
              </button>
            </span>
          </li>

          <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="font-medium">Take the roles back</span>
              <span className="block text-xs text-muted">Deletes the {view.counts.roles} roles JonnyBot made. Players lose the access they gave. {view.state.rolesRemovedAt ? `Done ${formatUtc(view.state.rolesRemovedAt)}.` : ""}</span>
            </span>
            <button
              type="button"
              className={dangerButton}
              disabled={disabled || !over || view.counts.roles === 0}
              onClick={() => setPending({ action: "roles", title: "Take the roles back?", body: `This deletes the ${view.counts.roles} roles from Discord. Players lose whatever those roles let them see.` })}
            >
              Take back
            </button>
          </li>

          <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="font-medium">Archive the channels</span>
              <span className="block text-xs text-muted">Moves the {view.counts.channels} channels into an &quot;Event archive&quot; category only staff can see, and removes the event&apos;s own categories. Nothing is deleted.</span>
            </span>
            <button
              type="button"
              className={dangerButton}
              disabled={disabled || !over || view.counts.channels === 0}
              onClick={() => setPending({ action: "archive", title: "Archive the channels?", body: "Players will no longer see these channels. Staff can still read them in the archive." })}
            >
              Archive
            </button>
          </li>

          <li className="space-y-2 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="min-w-0 flex-1">
                <span className="font-medium">Compress into one channel</span>
                <span className="block text-xs text-muted">Writes each channel&apos;s messages as a transcript file into one staff-only channel, so {view.counts.privateChannels || "many"} player or team channels become one. Images stay as links that expire, so export first if you need them.</span>
              </span>
              <button
                type="button"
                className={deleteOriginals ? dangerButton : ghostButton}
                disabled={disabled || !over || (compressAll ? view.counts.channels : view.counts.privateChannels) === 0}
                onClick={() =>
                  deleteOriginals
                    ? setPending({ action: "compress", title: "Compress and delete the originals?", body: "The transcripts are written first; then the original channels are deleted for good.", deleteOriginals: true, all: compressAll })
                    : run("compress", { all: compressAll }, "Writing the transcripts.")
                }
              >
                Compress
              </button>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={compressAll} disabled={busy} onChange={(e) => setCompressAll(e.target.checked)} /> Every channel, not just the players&apos; and teams&apos;
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={deleteOriginals} disabled={busy} onChange={(e) => setDeleteOriginals(e.target.checked)} /> Delete the originals afterwards
              </label>
            </div>
          </li>

          <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="font-medium">Delete the roles and channels</span>
              <span className="block text-xs text-muted">Removes everything JonnyBot made for this event from Discord, for good. Export first if you want the messages.</span>
            </span>
            <button
              type="button"
              className={dangerButton}
              disabled={disabled || !over || nothingMade}
              onClick={() => setPending({ action: "delete", title: "Delete everything?", body: `This deletes ${view.counts.channels} channels and ${view.counts.roles} roles from Discord and can't be undone.` })}
            >
              Delete
            </button>
          </li>
        </ul>
      </div>

      {pending && (
        <div role="dialog" aria-modal="true" className="space-y-3 rounded-xl border border-red-500/40 bg-red-500/5 p-5">
          <h3 className="font-semibold text-red-300">{pending.title}</h3>
          <p className="text-sm">{pending.body}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className={dangerButton}
              disabled={busy}
              onClick={() => run(pending.action, pending.action === "compress" ? { confirm: true, deleteOriginals: true, all: pending.all } : { confirm: true })}
            >
              Yes, do it
            </button>
            <button type="button" className={ghostButton} disabled={busy} onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
