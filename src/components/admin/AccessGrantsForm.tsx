"use client";

import { useState, useTransition } from "react";
import { addAccessGrantAction, removeAccessGrantAction } from "@/app/admin/(console)/actions";
import type { AccessGrant, AccessGrantList } from "@/lib/jonnybot-admin";
import { Card, FormField, inputClass, Notice, primaryButton } from "./ui";

type Result = { ok: true; data: AccessGrantList } | { ok: false; error: string };

export interface AccessGrantActions {
  add: (input: unknown) => Promise<Result>;
  remove: (id: string) => Promise<Result>;
}

const defaultActions: AccessGrantActions = { add: addAccessGrantAction, remove: removeAccessGrantAction };

/**
 * The restricted-content access list: who may enter each restricted part of the site without being a beta server admin. A person (by Discord ID) or a
 * server plus the least a person must be there. It only lifts the gate; it never gives anyone admin rights in a server.
 */
export function AccessGrantsForm({ initial, actions = defaultActions }: { initial: AccessGrantList; actions?: AccessGrantActions }) {
  const [data, setData] = useState(initial);
  const [subject, setSubject] = useState<"user" | "server">("user");
  const [area, setArea] = useState(initial.areas[0]?.key ?? "");
  const [userId, setUserId] = useState("");
  const [guildId, setGuildId] = useState("");
  const [level, setLevel] = useState("manage_server");
  const [note, setNote] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const areaLabel = (key: string) => data.areas.find((a) => a.key === key)?.label ?? key;

  function run(work: () => Promise<Result>, done: string, after?: () => void) {
    setError(null);
    setSaved(null);
    start(async () => {
      const result = await work();
      if (!result.ok) return setError(result.error);
      setData(result.data);
      setSaved(done);
      after?.();
    });
  }

  const ready = subject === "user" ? userId.trim() !== "" : guildId.trim() !== "";

  return (
    <div className="space-y-6">
      <Card title="Who is on the list" hint="These people can open the area named, even though it is closed to the public. Nothing here gives anyone rights in a server.">
        {data.grants.length === 0 ? (
          <p className="text-sm text-muted">Nobody yet. Only the clan&apos;s admins and the trusted beta servers&apos; admins get into closed areas.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {data.grants.map((g: AccessGrant) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1 basis-64 text-sm">
                  <p className="font-medium">
                    {g.subject === "user" ? (
                      <>
                        Person <code>{g.userId}</code>
                      </>
                    ) : (
                      <>
                        {g.serverName ?? "Server"} <code>{g.guildId}</code>: {g.levelLabel}
                      </>
                    )}
                    <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">{areaLabel(g.area)}</span>
                    {g.expired && <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">expired</span>}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {g.note || "No note"}
                    {g.expiresAt ? ` · until ${g.expiresAt.slice(0, 10)}` : " · no end date"}
                    {g.subject === "server" && g.botPresent === false && <span className="text-red-300"> · JonnyBot is not in this server, so it lets nobody in yet</span>}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50"
                  disabled={pending}
                  onClick={() => run(() => actions.remove(g.id), "Removed.")}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Add to the list" hint="Turn on Developer Mode in Discord, right-click a person or a server and choose Copy ID.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Area">
            <select className={inputClass} value={area} onChange={(e) => setArea(e.target.value)}>
              {data.areas.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Who">
            <select className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value === "server" ? "server" : "user")}>
              <option value="user">One person</option>
              <option value="server">A server, at a permission level</option>
            </select>
          </FormField>
          {subject === "user" ? (
            <FormField label="Discord user ID">
              <input className={inputClass} value={userId} inputMode="numeric" maxLength={20} placeholder="577853260153618443" onChange={(e) => setUserId(e.target.value)} />
            </FormField>
          ) : (
            <>
              <FormField label="Server ID">
                <input className={inputClass} value={guildId} inputMode="numeric" maxLength={20} placeholder="1388208054008545300" onChange={(e) => setGuildId(e.target.value)} />
              </FormField>
              <FormField label="Least they must be in that server" hint="JonnyBot has to be in the server to check.">
                <select className={inputClass} value={level} onChange={(e) => setLevel(e.target.value)}>
                  {data.levels.map((l) => (
                    <option key={l.key} value={l.key}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </>
          )}
          <FormField label="Note (so you remember why)">
            <input className={inputClass} value={note} maxLength={120} placeholder="Tester from RS Noobs" onChange={(e) => setNote(e.target.value)} />
          </FormField>
          <FormField label="Last day (optional)">
            <input className={inputClass} type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
          </FormField>
        </div>
        <button
          type="button"
          className={`${primaryButton} mt-4`}
          disabled={pending || !ready}
          onClick={() =>
            run(
              () => actions.add({ area, subject, userId, guildId, level, note, expiresOn }),
              "Added.",
              () => {
                setUserId("");
                setGuildId("");
                setNote("");
                setExpiresOn("");
              },
            )
          }
        >
          Add
        </button>
      </Card>

      {error && <Notice tone="error" title={error} />}
      {saved && <Notice tone="success" title={saved} />}
    </div>
  );
}
