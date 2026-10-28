"use client";

import { useState, useTransition } from "react";
import { ChannelSelect, RoleSelect } from "@/components/admin/pickers";
import { dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid, Span } from "@/components/dashboard/ui/Layout";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { GuildStructure, KickOfflineAction, KickOverview, KickStreamer } from "@/lib/jonnybot-admin";

type Result = Promise<{ ok: true; data: KickOverview } | { ok: false; error: string; problems: string[] }>;

export interface KickActions {
  settings: (input: { enabled: boolean; offlineAction: KickOfflineAction }) => Result;
  add: (input: { login: string; channelId: string | null; pingRoleId: string | null; message: string }) => Result;
  save: (id: string, input: { channelId: string | null; pingRoleId: string | null; message: string; enabled: boolean }) => Result;
  remove: (id: string) => Result;
}

const OFFLINE: { value: KickOfflineAction; label: string; hint: string }[] = [
  { value: "EDIT", label: "Edit the post", hint: "It changes to say the stream has ended, and the picture and ping go." },
  { value: "DELETE", label: "Delete the post", hint: "The channel is left clean." },
  { value: "KEEP", label: "Leave the post as it is", hint: "It stays as it was when the stream started." },
];

/**
 * Kick go-live alerts: the switch (off until chosen), what happens to the post when the stream ends, and the streamers followed, each with its channel,
 * an optional role to ping and an optional message. Following a streamer needs the bot's Kick app; without it the page says so and nothing can be
 * switched on. A streamer who is already live when added is not announced; only the next stream is.
 */
export function KickManager({ initial, structure, actions }: { initial: KickOverview; structure: GuildStructure; actions: KickActions }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [login, setLogin] = useState("");
  const [channelId, setChannelId] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function run(work: () => Result, after?: () => void) {
    setError(null);
    start(async () => {
      const result = await work();
      if (!result.ok) return setError(result.error);
      setData(result.data);
      after?.();
    });
  }

  const setSettings = (patch: Partial<{ enabled: boolean; offlineAction: KickOfflineAction }>) =>
    run(() => actions.settings({ enabled: patch.enabled ?? data.enabled, offlineAction: patch.offlineAction ?? data.offlineAction }));

  return (
    <div className="space-y-6">
      {!data.configured && (
        <Notice
          tone="error"
          title="The bot has no Kick app yet"
          items={[`Alerts cannot be switched on until the bot's owner adds ${data.envNames.join(" and ")} to the bot's settings. Nothing is lost: you can set everything up after.`]}
        />
      )}

      <CollapsibleCard
        id="kick-settings"
        title="Alerts"
        defaultOpen
        summary={
          <>
            <Chip tone={data.enabled ? "good" : "warn"}>{data.enabled ? "On" : "Off"}</Chip>
            <Chip>{OFFLINE.find((o) => o.value === data.offlineAction)?.label}</Chip>
          </>
        }
      >
        <div className="space-y-5">
          <Toggle
            checked={data.enabled}
            onChange={(next) => setSettings({ enabled: next })}
            disabled={pending || (!data.configured && !data.enabled)}
            label="Post when a followed streamer goes live"
            detail="Checked every couple of minutes. A stream that is already running when you switch this on is not announced."
          />
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold tracking-wider text-muted uppercase">When the stream ends</legend>
            {OFFLINE.map((o) => (
              <label key={o.value} className="flex items-start gap-2 text-sm">
                <input type="radio" name="kick-offline" className="mt-1" checked={data.offlineAction === o.value} disabled={pending} onChange={() => setSettings({ offlineAction: o.value })} />
                <span>
                  <span className="font-medium">{o.label}</span>
                  <span className="block text-xs text-muted">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="kick-add" title="Follow a streamer" defaultOpen={data.streamers.length === 0} summary={<Chip>{data.streamers.length} of {data.max}</Chip>}>
        <div className="space-y-4">
          <FieldGrid>
            <FormField label="Kick channel" hint="The name, or the address like kick.com/name.">
              <input className={inputClass} value={login} maxLength={100} onChange={(e) => setLogin(e.target.value)} placeholder="kick.com/name" />
            </FormField>
            <FormField label="Post alerts in">
              <ChannelSelect channels={structure.channels} value={channelId} onChange={setChannelId} none="Choose a channel" onlyPostable allowForums={false} />
            </FormField>
            <FormField label="Ping this role (optional)">
              <RoleSelect roles={structure.roles} value={roleId} onChange={setRoleId} none="Nobody" />
            </FormField>
            <Span>
              <FormField label="Message (optional)" size="lg" hint={`Use {streamer}, {title}, {game} and {url}. Empty uses: ${data.defaultMessage}`}>
                <input className={inputClass} value={message} maxLength={data.maxMessage} onChange={(e) => setMessage(e.target.value)} />
              </FormField>
            </Span>
          </FieldGrid>
          <button
            type="button"
            className={primaryButton}
            disabled={pending || !login.trim() || !channelId || !data.configured || data.streamers.length >= data.max}
            onClick={() =>
              run(() => actions.add({ login, channelId, pingRoleId: roleId, message }), () => {
                setLogin("");
                setMessage("");
              })
            }
          >
            Follow
          </button>
          {!data.configured && <p className="text-sm text-muted">Following needs the bot&apos;s Kick app (see the notice above).</p>}
        </div>
      </CollapsibleCard>

      {error && <Notice tone="error" title={error} />}

      {data.streamers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-8 text-center">
          <p className="font-medium">Nobody followed yet</p>
          <p className="mt-1 text-sm text-muted">Add a streamer above and pick the channel their go-live posts go to.</p>
        </div>
      ) : (
        data.streamers.map((s) => <StreamerCard key={s.id} streamer={s} structure={structure} pending={pending} actions={actions} run={run} maxMessage={data.maxMessage} />)
      )}
    </div>
  );
}

function StreamerCard({
  streamer,
  structure,
  pending,
  actions,
  run,
  maxMessage,
}: {
  streamer: KickStreamer;
  structure: GuildStructure;
  pending: boolean;
  actions: KickActions;
  run: (work: () => Result) => void;
  maxMessage: number;
}) {
  const [draft, setDraft] = useState(streamer);
  const dirty = JSON.stringify([draft.channelId, draft.pingRoleId, draft.message ?? "", draft.enabled]) !== JSON.stringify([streamer.channelId, streamer.pingRoleId, streamer.message ?? "", streamer.enabled]);
  const channelName = structure.channels.find((c) => c.id === streamer.channelId)?.name;

  return (
    <CollapsibleCard
      id={`kick-${streamer.id}`}
      title={streamer.displayName || streamer.login}
      summary={
        <>
          <Chip tone={streamer.enabled ? "good" : "warn"}>{streamer.enabled ? "Following" : "Paused"}</Chip>
          {streamer.liveNow && <Chip tone="good">Live now</Chip>}
          <Chip>{channelName ? `#${channelName}` : "Channel missing"}</Chip>
          {streamer.problem && <Chip tone="bad">Cannot post</Chip>}
        </>
      }
    >
      <div className="space-y-4">
        {streamer.problem && <Notice tone="error" title={streamer.problem} />}
        <Toggle checked={draft.enabled} onChange={(next) => setDraft({ ...draft, enabled: next })} label="Following" detail="Paused, no alerts are posted for this streamer." />
        <FieldGrid>
          <FormField label="Post alerts in">
            <ChannelSelect channels={structure.channels} value={draft.channelId} onChange={(id) => setDraft({ ...draft, channelId: id ?? draft.channelId })} none="Choose a channel" onlyPostable allowForums={false} />
          </FormField>
          <FormField label="Ping this role">
            <RoleSelect roles={structure.roles} value={draft.pingRoleId} onChange={(id) => setDraft({ ...draft, pingRoleId: id })} none="Nobody" />
          </FormField>
          <Span>
            <FormField label="Message" size="lg">
              <input className={inputClass} value={draft.message ?? ""} maxLength={maxMessage} onChange={(e) => setDraft({ ...draft, message: e.target.value })} />
            </FormField>
          </Span>
        </FieldGrid>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={primaryButton} disabled={pending || !dirty} onClick={() => run(() => actions.save(streamer.id, { channelId: draft.channelId, pingRoleId: draft.pingRoleId, message: draft.message ?? "", enabled: draft.enabled }))}>
            Save
          </button>
          <button type="button" className={ghostButton} disabled={!dirty} onClick={() => setDraft(streamer)}>
            Discard
          </button>
          <span className="flex-1" />
          <a href={`https://kick.com/${streamer.login}`} target="_blank" rel="noreferrer" className={ghostButton}>
            Open on Kick
          </a>
          <button
            type="button"
            className={dangerButton}
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Stop following ${streamer.displayName || streamer.login}?`)) run(() => actions.remove(streamer.id));
            }}
          >
            Unfollow
          </button>
        </div>
      </div>
    </CollapsibleCard>
  );
}
