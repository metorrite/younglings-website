"use client";

import { useRef, useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, inputClass } from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import {
  choicesOf,
  type Goodbye,
  type GuildStructure,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

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

const shape = (g: Pick<Goodbye, "enabled" | "channelId" | "content">) =>
  JSON.stringify([g.enabled, g.channelId, g.content]);

/** A line posted when someone leaves, with clickable variables and a live preview. */
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
  const box = useRef<HTMLTextAreaElement>(null);
  const dirty = shape(draft) !== shape(saved);
  const channelName =
    structure.channels.find((c) => c.id === draft.channelId)?.name ??
    "goodbyes";

  const change = (patch: Partial<Goodbye>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  /** Puts a variable at the cursor, so people don't have to remember or type the braces. */
  function insert(token: string) {
    const el = box.current;
    const at = el?.selectionStart ?? draft.content.length;
    const end = el?.selectionEnd ?? at;
    change({
      content: draft.content.slice(0, at) + token + draft.content.slice(end),
    });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  }

  const preview = draft.content
    .replaceAll("{username}", "PvmRyan")
    .replaceAll("{user}", "**PvmRyan**")
    .replaceAll("{server}", draft.serverName)
    .replaceAll("{count}", String(draft.memberCount))
    .replaceAll("{channel}", channelName);

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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="min-w-0 space-y-4">
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
          <Toggle
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            label="Announce people who leave"
            detail={
              draft.enabled
                ? "A message is posted when someone leaves."
                : "Nothing is posted."
            }
          />
          <FormField label="Channel" as="group">
            <ChannelSelect
              {...choicesOf(structure)}
              onlyPostable
              allowForums={false}
              value={draft.channelId}
              onChange={(id) => change({ channelId: id })}
              none="Choose a channel…"
            />
          </FormField>
        </CollapsibleCard>

        <CollapsibleCard
          id="goodbye-text"
          title="The message"
          hint="Plain text. Click a variable to add it where your cursor is."
          defaultOpen
          summary={
            <Chip>
              {draft.content.trim()
                ? `${draft.content.trim().length} characters`
                : "Uses the default"}
            </Chip>
          }
          info="Markdown works (**bold**, _italics_). Leave it empty to use the default message."
        >
          <FormField label="Text">
            <textarea
              ref={box}
              className={`${inputClass} min-h-28`}
              rows={4}
              value={draft.content}
              maxLength={draft.maxContent}
              onChange={(e) => change({ content: e.target.value })}
              placeholder="**{username}** has left **{server}**."
            />
          </FormField>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Variables"
          >
            {VARIABLES.map((v) => (
              <button
                key={v.token}
                type="button"
                title={v.meaning}
                onClick={() => insert(v.token)}
                className="rounded-full border border-surface-border px-2.5 py-1 font-mono text-xs text-gold transition hover:border-gold"
              >
                {v.token}
              </button>
            ))}
          </div>
        </CollapsibleCard>

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

      <div className="min-w-0">
        <div className="xl:sticky xl:top-4">
          <section className="rounded-xl border border-surface-border bg-surface p-5">
            <h2 className="font-semibold text-gold">Preview</h2>
            <p className="mt-1 text-xs text-muted">
              Roughly how it will look, for an example member called PvmRyan.
            </p>
            <div className="mt-3 rounded bg-[#313338] p-3 text-sm whitespace-pre-wrap text-[#dbdee1]">
              <p className="mb-1 text-xs text-[#949ba4]">#{channelName}</p>
              <FormattedLine text={preview.trim() || "—"} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** Just enough of Discord's bold and italics for the preview. */
function FormattedLine({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}
