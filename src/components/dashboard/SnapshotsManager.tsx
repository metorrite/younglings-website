"use client";

import { useState, useTransition } from "react";
import { Card, dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import type { DevSnapshotMeta, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Kind = "" | "event" | "ticket" | "member";

const KIND_LABEL: Record<Kind, string> = { "": "Nothing (whole server only)", event: "An event", ticket: "A ticket", member: "A member" };
const KIND_HINT: Record<Exclude<Kind, "">, string> = {
  event: "The event's number, as in event-manager/12.",
  ticket: "The ticket's number from the Tickets page.",
  member: "The member's Discord user ID (Developer Mode, right-click, Copy User ID).",
};

function size(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The bot owner's snapshot tool: take one (optionally narrowed to an event, ticket or member), copy its id into a bug report, download the zip, delete
 * it. Snapshots expire on their own after `keepDays`. Only reachable by the bot's owner; the bot refuses anyone else however this is reached.
 */
export function SnapshotsManager({
  guildId,
  initial,
  keepDays,
  take,
  remove,
}: {
  guildId: string;
  initial: DevSnapshotMeta[];
  keepDays: number;
  take: (focus: string) => Promise<WelcomeActionResult<{ snapshot: DevSnapshotMeta }>>;
  remove: (id: string) => Promise<WelcomeActionResult<{ deleted: string }>>;
}) {
  const [snapshots, setSnapshots] = useState(initial);
  const [kind, setKind] = useState<Kind>("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const needsId = kind !== "";
  const idOk = !needsId || /^\d{1,20}$/.test(target.trim());

  function takeOne() {
    setError(null);
    start(async () => {
      const result = await take(needsId ? `${kind}:${target.trim()}` : "");
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSnapshots((list) => [result.data.snapshot, ...list]);
      setTarget("");
    });
  }

  function removeOne(id: string) {
    setError(null);
    start(async () => {
      const result = await remove(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSnapshots((list) => list.filter((s) => s.id !== id));
    });
  }

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(id);
    } catch {
      setError("Couldn't copy; select the id and copy it by hand.");
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Take a snapshot" hint="Of this server, as it is now. Narrow it to one thing if the bug is about that thing.">
        <div className="flex flex-wrap items-end gap-4">
          <FormField label="Also include the database rows of" size="md">
            <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </FormField>
          {needsId && (
            <FormField label={kind === "member" ? "Discord user ID" : "Number"} hint={KIND_HINT[kind as Exclude<Kind, "">]} size="md">
              <input className={inputClass} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} />
            </FormField>
          )}
          <button type="button" className={primaryButton} disabled={pending || !idOk || (needsId && target.trim() === "")} onClick={takeOne}>
            {pending ? "Working…" : "Take snapshot"}
          </button>
        </div>
        {error && <Notice tone="error" title={error} />}
      </Card>

      <Card title="Snapshots" hint={`Kept ${keepDays} days, then deleted. The id is what goes in a bug report.`}>
        {snapshots.length === 0 ? (
          <p className="text-sm text-muted">No snapshots yet. Take one when something goes wrong, then put its id in the bug report.</p>
        ) : (
          <ul className="space-y-2">
            {snapshots.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-border bg-background/40 p-3 text-sm">
                <span className="min-w-0 flex-1">
                  <code className="font-mono text-foreground">{s.id}</code>
                  <span className="mt-0.5 block text-xs text-muted">
                    {new Date(s.createdAt).toLocaleString()} · {size(s.sizeBytes)}
                    {s.focus && ` · ${s.focus}`}
                    {s.guildId !== guildId && ` · server ${s.guildId}`}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <button type="button" className={ghostButton} onClick={() => copy(s.id)}>
                    {copied === s.id ? "Copied" : "Copy id"}
                  </button>
                  <a className={ghostButton} href={`/dashboard/${guildId}/snapshots/${s.id}/download`}>
                    Download
                  </a>
                  <button type="button" className={dangerButton} disabled={pending} onClick={() => removeOne(s.id)}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
