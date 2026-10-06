"use client";

import { useState, useTransition } from "react";
import { markPromotedAction, postMessageAction, saveCommunityAction, saveTrackingAction } from "@/app/admin/(console)/actions";
import type { GuildStructure, PromotionDue, TrackingGroupConfig } from "@/lib/jonnybot-admin";
import { Card, dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton } from "./ui";

// ---------- promotions ----------

export function PromotionsList({ initial }: { initial: PromotionDue[] }) {
  const [members, setMembers] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function done(rsn: string) {
    setError(null);
    start(async () => {
      const result = await markPromotedAction(rsn);
      if (!result.ok) setError(result.error);
      else setMembers(result.data);
    });
  }

  return (
    <Card title="Due a promotion" hint="Members whose clan points have reached their next rank. Promote them in game, then mark them done here so they drop off the list.">
      {members.length === 0 && <p className="text-sm text-muted">Nobody is waiting for a promotion right now. 🎉</p>}
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.rsn} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-border bg-background/40 px-4 py-3">
            <div>
              <p className="font-medium">{m.rsn}</p>
              <p className="text-xs text-muted">
                {m.rank} → <span className="text-foreground">{m.nextRank ?? "next rank"}</span> · {m.points} points{m.since ? ` · waiting since ${m.since}` : ""}
              </p>
            </div>
            <button type="button" className={ghostButton} disabled={pending} onClick={() => done(m.rsn)}>
              ✔ Mark promoted
            </button>
          </li>
        ))}
      </ul>
      {error && <Notice tone="error" title={error} />}
    </Card>
  );
}

// ---------- tracking channels ----------

function TrackingGroupCard({ group, channels }: { group: TrackingGroupConfig; channels: GuildStructure["channels"] }) {
  const [enabled, setEnabled] = useState(group.enabled);
  const [chosen, setChosen] = useState(group.channels);
  const [adding, setAdding] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const have = new Set(chosen.map((c) => c.channelId));
  const available = channels.filter((c) => !have.has(c.id) && c.canPost);

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await saveTrackingAction(group.key, enabled, chosen.map((c) => c.channelId));
      if (!result.ok) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-surface-border bg-background/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{group.name}</p>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); setSaved(false); }} /> Enabled
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {chosen.length === 0 && <span className="text-xs text-muted">No channels — this feed isn&apos;t posted anywhere.</span>}
        {chosen.map((c) => (
          <span key={c.channelId} className="flex items-center gap-1.5 rounded-full border border-surface-border px-2.5 py-1 text-xs">
            #{c.name ?? "(deleted)"}
            <button type="button" aria-label={`Remove #${c.name}`} className="text-muted hover:text-red-400" onClick={() => { setChosen((all) => all.filter((x) => x.channelId !== c.channelId)); setSaved(false); }}>
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${inputClass} max-w-xs`} value={adding} onChange={(e) => setAdding(e.target.value)} aria-label={`Add a channel for ${group.name}`}>
          <option value="">Add a channel…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={ghostButton}
          disabled={!adding || chosen.length >= 5}
          onClick={() => {
            const channel = channels.find((c) => c.id === adding);
            if (channel) setChosen((all) => [...all, { channelId: channel.id, name: channel.name }]);
            setAdding("");
            setSaved(false);
          }}
        >
          + Add
        </button>
        <button type="button" className={primaryButton} disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && <span role="status" className="text-xs text-emerald-400">Saved</span>}
        {error && <span role="alert" className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}

export function TrackingEditor({ groups, channels }: { groups: TrackingGroupConfig[]; channels: GuildStructure["channels"] }) {
  const sources = [...new Set(groups.map((g) => g.source))];
  return (
    <div className="space-y-6">
      {sources.map((source) => (
        <Card key={source} title={source}>
          <div className="grid gap-3 lg:grid-cols-2">
            {groups.filter((g) => g.source === source).map((g) => (
              <TrackingGroupCard key={g.key} group={g} channels={channels} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------- post a message ----------

export function PostTool({ channels }: { channels: GuildStructure["channels"] }) {
  const postable = channels.filter((c) => c.canPost);
  const [text, setText] = useState("");
  const [channelId, setChannelId] = useState("");
  const [convert, setConvert] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(dryRun: boolean) {
    setError(null);
    setMessage(null);
    setProblems([]);
    start(async () => {
      const result = await postMessageAction({ text, channelId, convert, dryRun });
      if (!result.ok) {
        setError(result.error);
        setProblems(result.problems);
        return;
      }
      setProblems(result.data.warnings);
      setMessage(dryRun ? "Looks good — nothing was posted." : "Posted.");
      if (!dryRun) setText("");
    });
  }

  return (
    <div className="space-y-6">
      <Card title="Post a message" hint="Uses the same post tags as the Discord tools (headings, dividers, colours, images, buttons). Check it first, then post.">
        <textarea className={`${inputClass} min-h-56 font-mono`} value={text} maxLength={3500} onChange={(e) => setText(e.target.value)} placeholder={"### Weekly Cap Party!\nJoin us at the Citadel on Wednesday.\n~<LS>~\nBring your best gear."} aria-label="Message text" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={convert} onChange={(e) => setConvert(e.target.checked)} /> Tidy plain text into headings and lists first
        </label>
        <FormField label="Channel">
          <select className={inputClass} value={channelId} onChange={(e) => setChannelId(e.target.value)}>
            <option value="">Choose a channel…</option>
            {postable.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
                {c.category ? ` — ${c.category}` : ""}
              </option>
            ))}
          </select>
        </FormField>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={ghostButton} disabled={pending || !text.trim()} onClick={() => run(true)}>
            Check it
          </button>
          <button type="button" className={primaryButton} disabled={pending || !text.trim() || !channelId} onClick={() => { if (window.confirm("Post this message to the channel now?")) run(false); }}>
            {pending ? "Working…" : "Post to channel"}
          </button>
          <button type="button" className={dangerButton} disabled={!text} onClick={() => setText("")}>
            Clear
          </button>
        </div>
      </Card>
      {error && <Notice tone="error" title={error} items={problems} />}
      {message && <Notice tone="success" title={message} items={problems} />}
    </div>
  );
}

// ---------- community settings ----------

export function CommunitySettingsForm({ pollChannelId, channels }: { pollChannelId: string | null; channels: GuildStructure["channels"] }) {
  const [value, setValue] = useState(pollChannelId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await saveCommunityAction(value || null);
      if (!result.ok) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-6">
      <Card title="Member polls" hint="Verified members can start polls from the website. They're posted in this channel. Leave it empty to turn member polls off (admins can still post polls anywhere).">
        <FormField label="Channel for member polls">
          <select className={inputClass} value={value} onChange={(e) => { setValue(e.target.value); setSaved(false); }}>
            <option value="">None — member polls are off</option>
            {channels.filter((c) => c.canPost).map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
                {c.category ? ` — ${c.category}` : ""}
              </option>
            ))}
          </select>
        </FormField>
      </Card>
      {error && <Notice tone="error" title={error} />}
      {saved && <Notice tone="success" title="Saved." />}
      <button type="button" className={primaryButton} disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
