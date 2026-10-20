"use client";

import { useState, useTransition } from "react";
import { MessageEditor } from "@/components/admin/MessageEditor";
import { ChannelSelect, RoleSelect } from "@/components/admin/pickers";
import { FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import type { ChannelChoices, GuildRole, WelcomeActionResult, WelcomeConfig, WelcomeDraft } from "@/lib/jonnybot-admin";
import { WELCOME_VARIABLES, type PreviewSample } from "@/lib/welcomePreview";
import { fillBanned } from "@/lib/banPreview";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Ping = "none" | "role" | "everyone" | "here";

export interface AnnouncementActions {
  saveBan: (draft: WelcomeDraft) => Promise<WelcomeActionResult<WelcomeConfig>>;
  testBan: (draft: WelcomeDraft) => Promise<WelcomeActionResult<{ sent: boolean; channelName: string }>>;
  send: (input: { channelId: string; message: string; roleId: string | null; everyone: boolean; here: boolean }) => Promise<WelcomeActionResult<{ sent: boolean; channelName: string }>>;
}

/** A ban announcement has no DM copy and no link button, and no `{rs_button}` or `{avatar}`-less variables beyond these. */
const BAN_VARIABLES = WELCOME_VARIABLES.filter((v) => ["{user}", "{username}", "{avatar}", "{server}", "{channel}", "{count}"].includes(v.token));

function toDraft(c: WelcomeConfig): WelcomeDraft {
  const { channelName, serverName, memberCount, serverIconUrl, ...draft } = c;
  void channelName;
  void serverName;
  void memberCount;
  void serverIconUrl;
  return { ...draft, alsoDm: false, linkButton: false };
}

export function AnnouncementsPanels({ ban, roles, actions, ...choices }: { ban: WelcomeConfig; roles: GuildRole[]; actions: AnnouncementActions } & ChannelChoices) {
  return (
    <div className="space-y-6">
      <SendAnnouncement roles={roles} actions={actions} {...choices} />
      <BanAnnouncement initial={ban} actions={actions} {...choices} />
    </div>
  );
}

/** The dashboard twin of /announce. The bot checks the ping against this admin's own permissions in the channel. */
function SendAnnouncement({ roles, actions, ...choices }: { roles: GuildRole[]; actions: AnnouncementActions } & ChannelChoices) {
  const [channelId, setChannelId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [ping, setPing] = useState<Ping>("none");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const ready = channelId !== null && message.trim() !== "" && (ping !== "role" || roleId !== null);

  function send() {
    if (!channelId) return;
    setOutcome(null);
    start(async () => {
      const result = await actions.send({ channelId, message, roleId: ping === "role" ? roleId : null, everyone: ping === "everyone", here: ping === "here" });
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setMessage("");
      setOutcome({ tone: "success", title: `Posted in #${result.data.channelName}.` });
    });
  }

  return (
    <CollapsibleCard
      id="announce-send"
      title="Send an announcement"
      hint="Post a message in a channel as JonnyBot. The same as /announce in Discord."
      defaultOpen
      summary={<Chip>{ping === "none" ? "No ping" : ping === "role" ? "Pings a role" : `Pings @${ping}`}</Chip>}
      info="@everyone and @here only work if you may mention everyone in that channel yourself; a role needs to be mentionable, or the same permission. Anything you type in the message that looks like a ping is switched off: only the ping you choose here is sent."
    >
      <FormField label="Channel" size="md" as="group">
        <ChannelSelect {...choices} onlyPostable allowForums={false} value={channelId} onChange={setChannelId} none="Choose a channel…" />
      </FormField>
      <FormField label="Message" size="lg" hint="Markdown works. Up to 1800 characters.">
        <textarea className={`${inputClass} min-h-28`} rows={4} maxLength={1800} value={message} onChange={(e) => { setMessage(e.target.value); setOutcome(null); }} />
        <span className={`block text-right text-xs tabular-nums ${message.length > 1800 ? "text-red-400" : "text-muted"}`}>{message.length}/1800</span>
      </FormField>
      <FormField label="Ping" size="md">
        <select className={inputClass} value={ping} onChange={(e) => setPing(e.target.value as Ping)}>
          <option value="none">Nobody</option>
          <option value="role">A role</option>
          <option value="everyone">@everyone</option>
          <option value="here">@here</option>
        </select>
      </FormField>
      {ping === "role" && (
        <FormField label="Role to ping" size="md" as="group">
          <RoleSelect roles={roles} value={roleId} onChange={setRoleId} none="Choose a role…" />
        </FormField>
      )}
      {(ping === "everyone" || ping === "here") && <p className="text-xs text-amber-300">This notifies a lot of people. It only goes out if you have the Mention Everyone permission in that channel.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButton} disabled={pending || !ready} onClick={send}>
          {pending ? "Posting…" : "Post announcement"}
        </button>
        {!ready && <span className="text-xs text-muted">Choose a channel and write a message{ping === "role" ? " and pick the role" : ""} first.</span>}
      </div>
      {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
    </CollapsibleCard>
  );
}

function BanAnnouncement({ initial, actions, ...choices }: { initial: WelcomeConfig; actions: AnnouncementActions } & ChannelChoices) {
  const [draft, setDraft] = useState<WelcomeDraft>(() => toDraft(initial));
  const [saved, setSaved] = useState<WelcomeDraft>(() => toDraft(initial));
  const [meta, setMeta] = useState({ serverName: initial.serverName, memberCount: initial.memberCount });
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();

  const edit = (next: WelcomeDraft) => {
    setDraft({ ...next, alsoDm: false });
    setOutcome(null);
  };
  const channel = choices.channels.find((c) => c.id === draft.channelId);
  const sample: PreviewSample = {
    username: "PvmRyan",
    server: meta.serverName || "Your server",
    channel: channel?.name ?? initial.channelName ?? "bans",
    count: meta.memberCount,
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
  };

  function save() {
    setOutcome(null);
    start(async () => {
      const result = await actions.saveBan(draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setDraft(toDraft(result.data));
      setSaved(toDraft(result.data));
      setMeta({ serverName: result.data.serverName, memberCount: result.data.memberCount });
      setOutcome({ tone: "success", title: draft.enabled ? "Saved. Bans will be announced." : "Saved. Ban announcements are switched off, so nothing will be posted." });
    });
  }

  function sendTest() {
    setOutcome(null);
    start(async () => {
      const result = await actions.testBan(draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setOutcome({ tone: "success", title: `Test posted in #${result.data.channelName}, as if you had been banned. Nobody was pinged. Delete it there when you've had a look.` });
    });
  }

  return (
    <section aria-labelledby="ban-heading" className="space-y-3">
      <h2 id="ban-heading" className="border-b border-surface-border pb-1 text-lg font-semibold text-gold">
        Ban announcement
      </h2>
      <MessageEditor
        draft={draft}
        saved={saved}
        onChange={edit}
        idPrefix="ban"
        variables={BAN_VARIABLES}
        sample={sample}
        fill={fillBanned}
        messageHint="What is posted when someone is banned."
        previewHint="Roughly how it will look, for an example member called PvmRyan."
        variablesHint="Use these anywhere in the text boxes. {user} shows the person's name in bold, because someone who was banned can't be mentioned."
        before={
          <CollapsibleCard
            id="ban-delivery"
            title="When and where"
            hint="Off by default. Switch it on and choose the channel."
            defaultOpen
            summary={
              <>
                <Chip tone={draft.enabled ? "good" : "bad"}>{draft.enabled ? "On" : "Off"}</Chip>
                <Chip tone={draft.channelId ? "plain" : "warn"}>{draft.channelId ? `#${channel?.name ?? "channel"}` : "No channel"}</Chip>
              </>
            }
            info="Posted when someone is banned from the server. Bots aren't announced, nobody is ever pinged, and the ban's reason isn't known to the bot so it can't be quoted. A banned member also counts as leaving, so if the Goodbye message is on too, both are posted."
          >
            <SettingRow title="Announce bans" hint={draft.enabled ? "A message is posted when someone is banned." : "Nothing is posted."} checked={draft.enabled} onChange={(on) => edit({ ...draft, enabled: on })} offHint="Off: nothing is posted. Your channel and message are kept. A test still works.">
              {null}
            </SettingRow>
            <FormField label="Channel" size="md" as="group" hint="Only channels JonnyBot can post in are listed.">
              <ChannelSelect {...choices} onlyPostable allowForums={false} value={draft.channelId} onChange={(id) => edit({ ...draft, channelId: id })} none="Choose a channel…" />
            </FormField>
          </CollapsibleCard>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={primaryButton} disabled={pending} onClick={save}>
              {pending ? "Working…" : "Save"}
            </button>
            <button type="button" className={ghostButton} disabled={pending || !draft.channelId} title={draft.channelId ? undefined : "Choose a channel first"} onClick={sendTest}>
              Send test
            </button>
            <span className="min-w-0 flex-1 basis-60 text-xs text-muted">The test posts a real message in the channel as if you had just been banned. It uses what is on screen and works while the announcement is off. Nobody is pinged.</span>
          </div>
          {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
        </div>
      </MessageEditor>
    </section>
  );
}
