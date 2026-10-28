"use client";

import { useState, useTransition } from "react";
import { MessageEditor } from "@/components/admin/MessageEditor";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField } from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import {
  choicesOf,
  type Goodbye,
  type GuildStructure,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";
import { EMPTY_MESSAGE } from "@/lib/messageDraft";
import type { PreviewSample } from "@/lib/welcomePreview";

type Outcome = {
  tone: "error" | "success";
  title: string;
  items?: string[];
} | null;

const VARIABLES = [
  { token: "{username}", meaning: "The leaver's name" },
  { token: "{user}", meaning: "Their name in bold" },
  { token: "{server}", meaning: "The server's name" },
  { token: "{count}", meaning: "How many members the server has now" },
  { token: "{channel}", meaning: "This channel's name" },
];

/** The goodbye message's variables are filled the way the bot does it (GoodbyeService): {user} is bold text, nothing is a mention. */
function fillGoodbye(template: string, sample: PreviewSample) {
  const text = template
    .replaceAll("{username}", sample.username)
    .replaceAll("{user}", `**${sample.username}**`)
    .replaceAll("{server}", sample.server)
    .replaceAll("{count}", String(sample.count))
    .replaceAll("{channel}", sample.channel);
  return { text, mentions: {} };
}

const shape = (g: Pick<Goodbye, "enabled" | "channelId" | "content">) =>
  JSON.stringify([g.enabled, g.channelId, g.content]);

/**
 * A line posted when someone leaves, with clickable variables and a live preview. The channel belongs to the switch (it only matters while it is on) and the
 * preview sits under the text it shows, so the page is two panels side by side. There is nothing here a new server doesn't need, so no Basic / Advanced switch.
 */
export function GoodbyeForm({
  initial,
  structure,
  save,
}: {
  initial: Goodbye;
  structure: GuildStructure;
  save: (
    draft: Pick<Goodbye, "enabled" | "channelId" | "content">,
  ) => Promise<WelcomeActionResult<Goodbye>>;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(saved);
  const channelName =
    structure.channels.find((c) => c.id === draft.channelId)?.name ??
    "goodbyes";

  const change = (patch: Partial<Goodbye>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save({
        enabled: draft.enabled,
        channelId: draft.channelId,
        content: draft.content,
      });
      if (!result.ok)
        return setOutcome({
          tone: "error",
          title: result.error,
          items: result.problems,
        });
      setSaved(result.data);
      setDraft(result.data);
      setOutcome({
        tone: "success",
        title: draft.enabled
          ? "Saved. Departures will be announced."
          : "Saved. The goodbye message is switched off.",
      });
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="goodbye-where"
          title="Where and when"
          hint="Switch it on and choose the channel."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.enabled ? "good" : "bad"}>
                {draft.enabled ? "On" : "Off"}
              </Chip>
              <Chip tone={draft.channelId ? "plain" : "warn"}>
                {draft.channelId ? `#${channelName}` : "No channel"}
              </Chip>
            </>
          }
          info="Posted when a person leaves or is removed from the server. Bots leaving aren't announced, and nothing in the message can ping anyone."
        >
          <SettingRow
            title="Announce people who leave"
            hint={
              draft.enabled
                ? "A message is posted when someone leaves."
                : "Nothing is posted."
            }
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            offHint="Off: nothing is posted. Your channel and message are kept."
          >
            <FormField label="Channel" size="md" as="group">
              <ChannelSelect
                {...choicesOf(structure)}
                onlyPostable
                allowForums={false}
                value={draft.channelId}
                onChange={(id) => change({ channelId: id })}
                none="Choose a channel…"
              />
            </FormField>
          </SettingRow>
        </CollapsibleCard>

        <MessageEditor
          textOnly
          idPrefix="goodbye"
          draft={{ ...EMPTY_MESSAGE, content: draft.content }}
          saved={{ ...EMPTY_MESSAGE, content: saved.content }}
          onChange={(next) => change({ content: next.content })}
          variables={VARIABLES}
          sample={{ username: "PvmRyan", server: draft.serverName, channel: channelName, count: draft.memberCount, avatarUrl: "" }}
          fill={fillGoodbye}
          limits={{ content: draft.maxContent }}
          textCard={{
            title: "The message",
            hint: "Plain text. Click a variable to add it where your cursor is.",
            info: "Markdown works (**bold**, _italics_). Leave it empty to use the default message.",
            emptySummary: "Uses the default",
            placeholder: "**{username}** has left **{server}**.",
            previewChannel: channelName,
          }}
        />
      </PanelGrid>

      <SaveBar
        pending={pending}
        onSave={submit}
        outcome={outcome}
        dirty={dirty}
        onDiscard={() => {
          setDraft(saved);
          setOutcome(null);
        }}
      />
    </div>
  );
}

