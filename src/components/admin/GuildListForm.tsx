"use client";

import { useState, useTransition } from "react";
import { Card, FormField, inputClass, Notice, primaryButton } from "./ui";

/** A list of Discord servers the bot's owner keeps (the JonnyBot beta testers, the servers on the premium plan). */
export interface GuildListData {
  guilds: { guildId: string; label: string; botPresent: boolean; name: string | null }[];
  /** Only the bot's owner may change the list. */
  canEdit: boolean;
}

type Result = { ok: true; data: GuildListData } | { ok: false; error: string };

export interface GuildListCopy {
  title: string;
  hint: string;
  empty: string;
  /** Said when the person may look but not change. */
  readOnly: string;
  /** Said about a server the bot isn't in. */
  notPresent: string;
}

/** One editable list of servers: change a label, remove a server, add one by its ID. Read by every admin, changed only by the bot's owner. */
export function GuildListForm({
  initial,
  copy,
  save,
  remove,
}: {
  initial: GuildListData;
  copy: GuildListCopy;
  save: (guildId: string, label: string) => Promise<Result>;
  remove: (guildId: string) => Promise<Result>;
}) {
  const [data, setData] = useState(initial);
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(work: () => Promise<Result>, done: string, after?: () => void) {
    setError(null);
    setSaved(null);
    start(async () => {
      const result = await work();
      if (!result.ok) return setError(result.error);
      setData(result.data);
      setLabels({});
      setSaved(done);
      after?.();
    });
  }

  return (
    <div className="space-y-6">
      <Card title={copy.title} hint={copy.hint}>
        {data.guilds.length === 0 ? (
          <p className="text-sm text-muted">{copy.empty}</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {data.guilds.map((g) => {
              const label = labels[g.guildId] ?? g.label;
              return (
                <li key={g.guildId} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    {data.canEdit ? (
                      <input className={inputClass} value={label} maxLength={60} placeholder="Label" aria-label={`Label for ${g.guildId}`} onChange={(e) => setLabels({ ...labels, [g.guildId]: e.target.value })} />
                    ) : (
                      <span className="font-medium">{g.label || "Unnamed"}</span>
                    )}
                    <div className="mt-1 text-xs text-muted">
                      <code>{g.guildId}</code>
                      {g.botPresent ? <span> · JonnyBot is in {g.name ?? "this server"}</span> : <span className="text-red-300"> · {copy.notPresent}</span>}
                    </div>
                  </div>
                  {data.canEdit && (
                    <div className="flex gap-2">
                      <button type="button" className={primaryButton} disabled={pending || label === g.label} onClick={() => run(() => save(g.guildId, label), "Saved.")}>
                        Save
                      </button>
                      <button type="button" className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50" disabled={pending} onClick={() => run(() => remove(g.guildId), "Removed.")}>
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {data.canEdit ? (
        <Card title="Add a server" hint="Turn on Developer Mode in Discord, right-click the server's icon and choose Copy Server ID.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Server ID">
              <input className={inputClass} value={newId} inputMode="numeric" maxLength={20} placeholder="577853260153618443" onChange={(e) => setNewId(e.target.value)} />
            </FormField>
            <FormField label="Label (so you remember whose it is)">
              <input className={inputClass} value={newLabel} maxLength={60} placeholder="Koalafied" onChange={(e) => setNewLabel(e.target.value)} />
            </FormField>
          </div>
          <button
            type="button"
            className={`${primaryButton} mt-4`}
            disabled={pending || !newId.trim()}
            onClick={() =>
              run(
                () => save(newId, newLabel),
                "Added.",
                () => {
                  setNewId("");
                  setNewLabel("");
                },
              )
            }
          >
            {pending ? "Working…" : "Add server"}
          </button>
        </Card>
      ) : (
        <p className="text-sm text-muted">{copy.readOnly}</p>
      )}

      {error && <Notice tone="error" title={error} />}
      {saved && <Notice tone="success" title={saved} />}
    </div>
  );
}
