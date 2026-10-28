"use client";

import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { useViewMode } from "@/components/dashboard/ui/ViewMode";
import { useState, useTransition } from "react";
import type { ForumInfo, ForumThread, GuildStructure, WelcomeActionResult, WelcomeConfig, WelcomeDraft } from "@/lib/jonnybot-admin";
import { WELCOME_VARIABLES, type PreviewSample } from "@/lib/welcomePreview";
import { MessageEditor } from "./MessageEditor";
import { ChannelSelect } from "./pickers";
import { FormField, ghostButton, Notice, primaryButton } from "./ui";

function toDraft(c: WelcomeConfig): WelcomeDraft {
  const { channelName, serverName, memberCount, serverIconUrl, ...draft } = c;
  void channelName;
  void serverName;
  void memberCount;
  void serverIconUrl;
  return draft;
}

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

/** The two things the editor does on the server. The page passes the Server Actions for whichever server it manages, so this one editor serves the clan's admin console and the bot dashboard alike. */
export interface WelcomeActions {
  save: (draft: WelcomeDraft) => Promise<WelcomeActionResult<WelcomeConfig>>;
  test: (draft: WelcomeDraft) => Promise<WelcomeActionResult<{ sent: boolean; channelName: string; dmSent: boolean }>>;
  /** Where pictures for the embed's places are posted (`{url}/{slot}`; a new one replaces the old), and the action that deletes one. Without both the picture fields are just addresses. */
  imageUploadUrl?: string;
  removeImage?: (slot: string) => Promise<WelcomeActionResult<{ removed: boolean }>>;
}

/**
 * The welcome message: where it goes (delivery) and the save and test buttons are this page's own; the message itself, its link
 * button, the variables and the preview are the shared MessageEditor. The saved fields are unchanged.
 */
export function WelcomeEditor({ initial, channels, forums, threads, actions }: { initial: WelcomeConfig; channels: GuildStructure["channels"]; forums?: ForumInfo[]; threads?: ForumThread[]; actions: WelcomeActions }) {
  const [draft, setDraft] = useState<WelcomeDraft>(() => toDraft(initial));
  // what was last saved: Basic keeps showing an option that is already in use, so a setting never goes out of sight
  const [saved, setSaved] = useState<WelcomeDraft>(() => toDraft(initial));
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const [meta, setMeta] = useState({ serverName: initial.serverName, memberCount: initial.memberCount });
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const uploads = actions.imageUploadUrl && actions.removeImage ? { url: actions.imageUploadUrl, remove: actions.removeImage } : undefined;

  const edit = (next: WelcomeDraft) => {
    setDraft(next);
    setOutcome(null);
  };

  const channel = channels.find((c) => c.id === draft.channelId);
  const sample: PreviewSample = {
    username: "PvmRyan",
    server: meta.serverName || "Your server",
    channel: channel?.name ?? initial.channelName ?? "welcome",
    count: meta.memberCount,
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
  };

  function save() {
    setOutcome(null);
    start(async () => {
      const result = await actions.save(draft);
      if (!result.ok) {
        setOutcome({ tone: "error", title: result.error, items: result.problems });
        return;
      }
      setDraft(toDraft(result.data));
      setSaved(toDraft(result.data));
      setMeta({ serverName: result.data.serverName, memberCount: result.data.memberCount });
      setOutcome({ tone: "success", title: draft.enabled ? "Saved. New members will be welcomed." : "Saved. The welcome is switched off, so nothing will be sent yet." });
    });
  }

  function sendTest() {
    setOutcome(null);
    start(async () => {
      const result = await actions.test(draft);
      if (!result.ok) {
        setOutcome({ tone: "error", title: result.error, items: result.problems });
        return;
      }
      const dm = draft.alsoDm ? (result.data.dmSent ? " A copy was also sent to you by DM." : " It couldn't be sent to you by DM (your DMs may be closed).") : "";
      setOutcome({ tone: "success", title: `Test posted in #${result.data.channelName}.${dm} Delete it there when you've had a look.` });
    });
  }

  // The copy by DM is this page's own option: Basic hides it unless it was saved on, and the editor's "More in Advanced" line names it.
  const showDm = advanced || saved.alsoDm;
  const extraHidden = showDm ? undefined : { names: ["a copy by DM"], inUse: draft.alsoDm ? ["a copy by DM"] : [] };

  return (
    <MessageEditor
      draft={draft}
      saved={saved}
      onChange={edit}
      idPrefix="welcome"
      variables={WELCOME_VARIABLES}
      sample={sample}
      uploads={uploads}
      linkButton
      extraHidden={extraHidden}
      messageHint="What new members are greeted with."
      textPlaceholder="Welcome to **{server}**, {user} 👋"
      previewNote={draft.alsoDm ? <p className="text-xs text-muted">A copy is also sent to the member by DM, without the button.</p> : undefined}
      before={
        <CollapsibleCard
          id="welcome-delivery"
          title="Delivery"
          hint="Where the welcome goes. The channel always gets it; a DM is sent as well when you ask for one and the member's DMs are open."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.enabled ? "good" : "bad"}>{draft.enabled ? "On" : "Off"}</Chip>
              <Chip tone={draft.channelId ? "plain" : "warn"}>{draft.channelId ? `#${channels.find((c) => c.id === draft.channelId)?.name ?? "channel"}` : "No channel"}</Chip>
              {draft.alsoDm && <Chip>Also by DM</Chip>}
            </>
          }
        >
          <SettingRow
            title="Welcome new members"
            hint="If Dyno's Welcome module is still on, turn it off when you switch this on, or each new member is greeted twice."
            checked={draft.enabled}
            onChange={(on) => edit({ ...draft, enabled: on })}
            offHint="Off: nobody is welcomed. Sending a test still works."
          >
            {showDm && (
              <Toggle
                checked={draft.alsoDm}
                onChange={(on) => edit({ ...draft, alsoDm: on })}
                label="Also send a copy by DM"
                detail="Skipped quietly if the member has DMs closed. The DM never has the link button, since that button only works inside the server."
              />
            )}
          </SettingRow>
          <FormField label="Welcome channel" size="md" as="group" hint="Only channels JonnyBot can post in are listed.">
            <ChannelSelect channels={channels} forums={forums} threads={threads} onlyPostable value={draft.channelId} onChange={(id) => edit({ ...draft, channelId: id })} none="Choose a channel…" />
          </FormField>
        </CollapsibleCard>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={primaryButton} disabled={pending} onClick={save}>
            {pending ? "Working…" : "Save"}
          </button>
          <button type="button" className={ghostButton} disabled={pending || !draft.channelId} title={draft.channelId ? undefined : "Choose a welcome channel first"} onClick={sendTest}>
            Send test
          </button>
          <span className="min-w-0 flex-1 basis-60 text-xs text-muted">
            {draft.channelId
              ? "The test posts a real message in the welcome channel as if you had just joined. It uses what's on screen, saved or not, and works while the welcome is switched off."
              : "Choose a welcome channel above to send a test. The welcome itself can stay switched off: a test works either way."}
          </span>
        </div>
        {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
      </div>
    </MessageEditor>
  );
}
