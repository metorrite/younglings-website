"use client";

import { useState, useTransition } from "react";
import { removeBetaGuildAction, saveBetaGuildAction } from "@/app/admin/(console)/actions";
import type { BetaGuilds } from "@/lib/jonnybot-admin";
import { Card, FormField, inputClass, Notice, primaryButton } from "./ui";

/** The trusted servers whose admins may use JonnyBot's website while it is closed. Read by every admin, changed only by the bot's owner. */
export function BetaAccessForm({ initial }: { initial: BetaGuilds }) {
  const [data, setData] = useState(initial);
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(work: () => ReturnType<typeof saveBetaGuildAction>, done: string, after?: () => void) {
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
      <Card
        title="Trusted servers"
        hint="Anyone who holds Administrator or Manage Server in one of these servers can use JonnyBot's website and dashboard normally while it is still closed to everyone else, just like the clan's own admins. JonnyBot has to be in the server for this to work."
      >
        {data.guilds.length === 0 ? (
          <p className="text-sm text-muted">No servers yet. Only the clan&apos;s admins can get in.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {data.guilds.map((g) => {
              const label = labels[g.guildId] ?? g.label;
              return (
                <li key={g.guildId} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    {data.canEdit ? (
                      <input
                        className={inputClass}
                        value={label}
                        maxLength={60}
                        placeholder="Label"
                        aria-label={`Label for ${g.guildId}`}
                        onChange={(e) => setLabels({ ...labels, [g.guildId]: e.target.value })}
                      />
                    ) : (
                      <span className="font-medium">{g.label || "Unnamed"}</span>
                    )}
                    <div className="mt-1 text-xs text-muted">
                      <code>{g.guildId}</code>
                      {g.botPresent ? (
                        <span> · JonnyBot is in {g.name ?? "this server"}</span>
                      ) : (
                        <span className="text-red-300"> · JonnyBot is not in this server, so nobody gets in through it yet</span>
                      )}
                    </div>
                  </div>
                  {data.canEdit && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={primaryButton}
                        disabled={pending || label === g.label}
                        onClick={() => run(() => saveBetaGuildAction(g.guildId, label), "Saved.")}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50"
                        disabled={pending}
                        onClick={() => run(() => removeBetaGuildAction(g.guildId), "Removed.")}
                      >
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
              run(() => saveBetaGuildAction(newId, newLabel), "Added.", () => {
                setNewId("");
                setNewLabel("");
              })
            }
          >
            {pending ? "Working…" : "Add server"}
          </button>
        </Card>
      ) : (
        <p className="text-sm text-muted">Only JonnyBot&apos;s owner can change this list.</p>
      )}

      {error && <Notice tone="error" title={error} />}
      {saved && <Notice tone="success" title={saved} />}
    </div>
  );
}
