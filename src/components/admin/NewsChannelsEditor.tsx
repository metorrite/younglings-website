"use client";

import { useState, useTransition } from "react";
import { saveNewsChannelsAction } from "@/app/admin/(console)/actions";
import type { GuildStructure, NewsChannelConfig } from "@/lib/jonnybot-admin";
import { Card, dangerButton, ghostButton, inputClass, Notice, primaryButton } from "./ui";

interface Row {
  channelId: string;
  label: string;
  name: string | null;
  readable: boolean;
}

export function NewsChannelsEditor({ initial, channels }: { initial: NewsChannelConfig[]; channels: GuildStructure["channels"] }) {
  const toRows = (configs: NewsChannelConfig[]): Row[] => configs.map((c) => ({ channelId: c.channelId, label: c.label ?? "", name: c.name, readable: c.readable }));

  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const [adding, setAdding] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const chosen = new Set(rows.map((r) => r.channelId));
  const available = channels.filter((c) => !chosen.has(c.id));

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await saveNewsChannelsAction(rows.map(({ channelId, label }) => ({ channelId, label })));
      if (!result.ok) setError(result.error);
      else {
        setRows(toRows(result.data));
        setSaved(true);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div role="note" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        <strong>Public.</strong> Everything posted in a channel you add here is shown to anyone who visits the website — including people who aren&apos;t in your Discord. Only add channels meant for everyone, like announcements and news.
      </div>

      <Card title="Channels shown on the home page" hint="The latest posts from these channels are merged, newest first. Text, images, embeds and JonnyBot's own posts all show. Up to 6 channels.">
        {rows.length === 0 && <p className="text-sm text-muted">No channels yet — the news block stays empty.</p>}

        {rows.map((row, i) => (
          <div key={row.channelId} className="space-y-2 rounded-md border border-surface-border bg-background/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">
                #{row.name ?? "(deleted channel)"}
                {!row.readable && <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-normal text-red-300">JonnyBot can&apos;t read this</span>}
              </span>
              <div className="flex gap-1.5">
                <button type="button" className={ghostButton} disabled={i === 0} onClick={() => setRows((r) => { const n = [...r]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })} aria-label="Move up">
                  ↑
                </button>
                <button type="button" className={ghostButton} disabled={i === rows.length - 1} onClick={() => setRows((r) => { const n = [...r]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })} aria-label="Move down">
                  ↓
                </button>
                <button type="button" className={dangerButton} onClick={() => setRows((r) => r.filter((x) => x.channelId !== row.channelId))}>
                  Remove
                </button>
              </div>
            </div>
            <input
              className={inputClass}
              placeholder="Label shown on each post (defaults to the channel name)"
              maxLength={40}
              value={row.label}
              onChange={(e) => setRows((r) => r.map((x) => (x.channelId === row.channelId ? { ...x, label: e.target.value } : x)))}
              aria-label="Label"
            />
          </div>
        ))}

        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-sm">
            <span className="mb-1 block text-xs text-muted">Add a channel</span>
            <select className={inputClass} value={adding} onChange={(e) => setAdding(e.target.value)}>
              <option value="">Choose a channel…</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                  {c.category ? ` — ${c.category}` : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={ghostButton}
            disabled={!adding || rows.length >= 6}
            onClick={() => {
              const channel = channels.find((c) => c.id === adding);
              if (channel) setRows((r) => [...r, { channelId: channel.id, label: "", name: channel.name, readable: true }]);
              setAdding("");
            }}
          >
            + Add
          </button>
        </div>
      </Card>

      {error && <Notice tone="error" title={error} />}
      {saved && <Notice tone="success" title="Saved. The home page updates within a minute." />}

      <button type="button" className={primaryButton} disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save news channels"}
      </button>
    </div>
  );
}
