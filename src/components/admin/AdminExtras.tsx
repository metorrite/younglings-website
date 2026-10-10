"use client";

import { useState, useTransition } from "react";
import { markPromotedAction, postMessageAction, saveCommunityAction, saveTrackingAction } from "@/app/admin/(console)/actions";
import type { ChannelChoices, ForumInfo, ForumThread, GuildStructure, PromotionDue, TrackingGroupConfig } from "@/lib/jonnybot-admin";
import { ChannelSelect } from "./pickers";
import { ChannelListPicker } from "@/components/dashboard/pickers";
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

/** Saves one tracking group; the clan console's own action by default, a server-bound one on the bot dashboard. */
type SaveTracking = (key: string, enabled: boolean, channelIds: string[]) => Promise<{ ok: true; data: undefined } | { ok: false; error: string }>;

function TrackingGroupCard({ group, choices, save: saveGroup }: { group: TrackingGroupConfig; choices: ChannelChoices; save: SaveTracking }) {
  const [enabled, setEnabled] = useState(group.enabled);
  const [chosen, setChosen] = useState(group.channels.map((c) => c.channelId));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await saveGroup(group.key, enabled, chosen);
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
      <ChannelListPicker {...choices} value={chosen} max={5} empty="No channels. This feed isn't posted anywhere." onChange={(ids) => { setChosen(ids); setSaved(false); }} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={primaryButton} disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && <span role="status" className="text-xs text-emerald-400">Saved</span>}
        {error && <span role="alert" className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}

export function TrackingEditor({ groups, channels, forums, threads, save = saveTrackingAction }: { groups: TrackingGroupConfig[]; channels: GuildStructure["channels"]; forums?: ForumInfo[]; threads?: ForumThread[]; save?: SaveTracking }) {
  const choices: ChannelChoices = { channels, forums: forums ?? [], threads: threads ?? [] };
  const sources = [...new Set(groups.map((g) => g.source))];
  return (
    <div className="space-y-6">
      {sources.map((source) => (
        <Card key={source} title={source}>
          <div className="grid gap-3 lg:grid-cols-2">
            {groups.filter((g) => g.source === source).map((g) => (
              <TrackingGroupCard key={g.key} group={g} choices={choices} save={save} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------- post a message ----------

export function PostTool({ channels, forums, threads }: { channels: GuildStructure["channels"]; forums?: ForumInfo[]; threads?: ForumThread[] }) {
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
          <ChannelSelect channels={channels} forums={forums} threads={threads} onlyPostable value={channelId || null} onChange={(id) => setChannelId(id ?? "")} none="Choose a channel…" />
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

export function CommunitySettingsForm({ pollChannelId, channels, forums, threads }: { pollChannelId: string | null; channels: GuildStructure["channels"]; forums?: ForumInfo[]; threads?: ForumThread[] }) {
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
          <ChannelSelect channels={channels} forums={forums} threads={threads} onlyPostable value={value || null} onChange={(id) => { setValue(id ?? ""); setSaved(false); }} none="None — member polls are off" />
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
