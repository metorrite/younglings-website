"use client";

import { confirmDialog } from "@/components/ui/Dialogs";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
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
        <Toggle checked={enabled} onChange={(on) => { setEnabled(on); setSaved(false); }} label="Enabled" />
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

/** The feeds that are the server's own audit trail rather than the clan's activity: only some servers want them, so they are Advanced. */
const ADVANCED_SOURCES = ["Discord Admin Log"];

export function TrackingEditor({ groups, channels, forums, threads, save = saveTrackingAction }: { groups: TrackingGroupConfig[]; channels: GuildStructure["channels"]; forums?: ForumInfo[]; threads?: ForumThread[]; save?: SaveTracking }) {
  const choices: ChannelChoices = { channels, forums: forums ?? [], threads: threads ?? [] };
  const allSources = [...new Set(groups.map((g) => g.source))];
  const [mode] = useViewMode();
  // which feeds are in use, as last saved: a source that already posts stays on screen in Basic
  const [inUse, setInUse] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.map((g) => [g.key, g.enabled && g.channels.length > 0])));
  const track: SaveTracking = async (key, enabled, channelIds) => {
    const result = await save(key, enabled, channelIds);
    if (result.ok) setInUse((all) => ({ ...all, [key]: enabled && channelIds.length > 0 }));
    return result;
  };
  const sources = allSources.filter((source) => mode === "advanced" || !ADVANCED_SOURCES.includes(source) || groups.some((g) => g.source === source && inUse[g.key]));
  const hidden = allSources.filter((source) => !sources.includes(source));
  return (
    <div className="space-y-4">
      {sources.map((source) => (
        <CollapsibleCard
          key={source}
          id={`tracking-${source}`}
          title={source}
          defaultOpen
          summary={(() => {
            const mine = groups.filter((g) => g.source === source);
            const on = mine.filter((g) => inUse[g.key]).length;
            return <Chip tone={on === 0 ? "warn" : "good"}>{on === 0 ? "Nothing posting yet" : `${on} of ${mine.length} posting`}</Chip>;
          })()}
        >
          <PanelGrid min="20rem" gap="gap-3">
            {groups.filter((g) => g.source === source).map((g) => (
              <TrackingGroupCard key={g.key} group={g} choices={choices} save={track} />
            ))}
          </PanelGrid>
        </CollapsibleCard>
      ))}
      {hidden.length > 0 && <MoreInAdvanced>the Discord admin log: where JonnyBot reports changes to the server&apos;s settings, channels, roles, members and messages.</MoreInAdvanced>}
    </div>
  );
}

// ---------- post a message ----------

/**
 * Write a message, choose the channel, check it, post it. Tidying plain text into headings and lists first is Advanced (and stays visible once it is ticked).
 */
export function PostTool({ channels, forums, threads, post = postMessageAction }: { channels: GuildStructure["channels"]; forums?: ForumInfo[]; threads?: ForumThread[]; post?: typeof postMessageAction }) {
  const [text, setText] = useState("");
  const [channelId, setChannelId] = useState("");
  const [convert, setConvert] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const showConvert = mode === "advanced" || convert;

  function run(dryRun: boolean) {
    setError(null);
    setMessage(null);
    setProblems([]);
    start(async () => {
      const result = await post({ text, channelId, convert, dryRun });
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
        <FormField label="Message" size="lg">
          <textarea className={`${inputClass} min-h-56 font-mono`} value={text} maxLength={3500} onChange={(e) => setText(e.target.value)} placeholder={"### Weekly Cap Party!\nJoin us at the Citadel on Wednesday.\n~<LS>~\nBring your best gear."} aria-label="Message text" />
        </FormField>
        <FormField label="Channel" size="md" as="group">
          <ChannelSelect channels={channels} forums={forums} threads={threads} onlyPostable value={channelId || null} onChange={(id) => setChannelId(id ?? "")} none="Choose a channel…" />
        </FormField>
        {showConvert && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={convert} onChange={(e) => setConvert(e.target.checked)} /> Tidy plain text into headings and lists first
          </label>
        )}
        <MoreInAdvanced>tidying plain text into headings and lists before it is posted.</MoreInAdvanced>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={ghostButton} disabled={pending || !text.trim()} onClick={() => run(true)}>
            Check it
          </button>
          <button type="button" className={primaryButton} disabled={pending || !text.trim() || !channelId} onClick={async () => { if (await confirmDialog({ title: "Post this message?", body: "It goes to the channel now.", confirmLabel: "Post it" })) run(false); }}>
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

export function CommunitySettingsForm({ pollChannelId, channels, forums, threads, save: saveChannel = saveCommunityAction }: { pollChannelId: string | null; channels: GuildStructure["channels"]; forums?: ForumInfo[]; threads?: ForumThread[]; save?: typeof saveCommunityAction }) {
  const [value, setValue] = useState(pollChannelId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await saveChannel(value || null);
      if (!result.ok) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      <CollapsibleCard
        id="community-polls"
        title="Member polls"
        hint="Verified members can start polls from the website. They're posted in this channel. Leave it empty to turn member polls off (admins can still post polls anywhere)."
        defaultOpen
        summary={<Chip tone={value ? "good" : "plain"}>{value ? "Member polls on" : "Member polls off"}</Chip>}
      >
        <FormField label="Channel for member polls" size="md" as="group">
          <ChannelSelect channels={channels} forums={forums} threads={threads} onlyPostable value={value || null} onChange={(id) => { setValue(id ?? ""); setSaved(false); }} none="None — member polls are off" />
        </FormField>
      </CollapsibleCard>
      {error && <Notice tone="error" title={error} />}
      {saved && <Notice tone="success" title="Saved." />}
      <button type="button" className={primaryButton} disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
