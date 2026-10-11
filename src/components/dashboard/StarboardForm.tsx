"use client";

import { useState, useTransition } from "react";
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
  type GuildStructure,
  type Starboard,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

type Outcome = {
  tone: "error" | "success";
  title: string;
  items?: string[];
} | null;
type Draft = Pick<
  Starboard,
  "enabled" | "channelId" | "emoji" | "threshold" | "selfStar"
>;

const EMOJI = ["⭐", "🌟", "🔥", "👍", "❤️", "🏆"];
const shape = (s: Draft) =>
  JSON.stringify([s.enabled, s.channelId, s.emoji, s.threshold, s.selfStar]);

/** A showcase channel: messages that collect enough of a reaction are copied there. */
export function StarboardForm({
  initial,
  structure,
  save,
}: {
  initial: Starboard;
  structure: GuildStructure;
  save: (draft: Draft) => Promise<WelcomeActionResult<Starboard>>;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(saved);
  const channelName = structure.channels.find(
    (c) => c.id === draft.channelId,
  )?.name;

  const change = (patch: Partial<Starboard>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save({
        enabled: draft.enabled,
        channelId: draft.channelId,
        emoji: draft.emoji,
        threshold: draft.threshold,
        selfStar: draft.selfStar,
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
          ? "Saved. Messages that reach the target will be copied."
          : "Saved. The starboard is switched off.",
      });
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="min-w-0 space-y-4">
        <CollapsibleCard
          id="starboard-where"
          title="Where and when"
          hint="Switch it on and choose the showcase channel."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.enabled ? "good" : "bad"}>
                {draft.enabled ? "On" : "Off"}
              </Chip>
              <Chip tone={draft.channelId ? "plain" : "warn"}>
                {draft.channelId
                  ? `#${channelName ?? "channel"}`
                  : "No channel"}
              </Chip>
            </>
          }
          info="Messages that collect enough of the reaction below are copied into this channel, with their author, text, first picture and a link back. It is a good home for the best drops and achievements."
        >
          <Toggle
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            label="Run the starboard"
            detail={
              draft.enabled
                ? "Messages that reach the target are copied."
                : "Nothing is copied."
            }
          />
          <FormField label="Starboard channel" as="group">
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
          id="starboard-rules"
          title="What counts"
          hint="Which reaction, and how many are needed."
          defaultOpen
          summary={
            <>
              <Chip>{draft.emoji}</Chip>
              <Chip>{draft.threshold} needed</Chip>
            </>
          }
          info="Members react to a message with this emoji to nominate it. If the count later drops below the target, the copy is taken down again. Reactions from bots never count."
        >
          <FormField
            label="Reaction"
            as="group"
            info="Click one, or type or paste any emoji (a custom server emoji works too)."
          >
            <div className="flex flex-wrap items-center gap-2">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={draft.emoji === e}
                  onClick={() => change({ emoji: e })}
                  className={`h-9 w-9 rounded-md border text-lg transition ${draft.emoji === e ? "border-gold bg-gold/15" : "border-surface-border hover:border-gold/50"}`}
                >
                  {e}
                </button>
              ))}
              <input
                className={`${inputClass} w-40`}
                value={draft.emoji}
                maxLength={64}
                aria-label="Emoji"
                onChange={(e) => change({ emoji: e.target.value })}
              />
            </div>
          </FormField>
          <FormField label="Reactions needed" as="group">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={draft.maxThreshold}
                value={draft.threshold}
                aria-label="Reactions needed"
                onChange={(e) => change({ threshold: Number(e.target.value) })}
                className="w-56 accent-[var(--color-gold)]"
              />
              <span className="w-8 text-center font-semibold tabular-nums">
                {draft.threshold}
              </span>
            </div>
          </FormField>
          <Toggle
            checked={draft.selfStar}
            onChange={(on) => change({ selfStar: on })}
            label="Let people star their own messages"
            detail={
              draft.selfStar
                ? "An author's own reaction counts."
                : "An author's own reaction is ignored."
            }
          />
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
              How a message looks once it is on the starboard.
            </p>
            <div className="mt-3 rounded bg-[#313338] p-3 text-sm text-[#dbdee1]">
              <p className="mb-2 text-xs text-[#949ba4]">
                #{channelName ?? "starboard"}
              </p>
              <p className="font-medium">
                {draft.emoji} <strong>{draft.threshold + 2}</strong> | #drops
              </p>
              <div
                className="mt-2 rounded border-l-4 bg-[#2b2d31] p-3"
                style={{ borderLeftColor: "#ffac33" }}
              >
                <p className="text-xs font-semibold text-white">PvmRyan</p>
                <p className="mt-1">Finally got the pet after 2,300 kills!</p>
                <p className="mt-2 text-xs text-[#00a8fc]">
                  Jump to the message
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
