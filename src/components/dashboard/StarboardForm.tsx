"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, inputClass } from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { andList } from "@/components/dashboard/ui/andList";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
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

/**
 * A showcase channel: messages that collect enough of a reaction are copied there. The switch owns the channel (it only matters while it is on); the preview sits
 * under the rules it shows. Basic is the switch, the channel, one of the usual reactions and how many are needed; Advanced adds any other emoji (a server emoji
 * works too) and letting authors star their own messages, and whatever is already saved there stays visible in Basic.
 */
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
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const dirty = shape(draft) !== shape(saved);
  const channelName = structure.channels.find(
    (c) => c.id === draft.channelId,
  )?.name;
  const showOwnEmoji = advanced || !EMOJI.includes(saved.emoji);
  const showSelfStar = advanced || saved.selfStar;
  const hidden = [!showOwnEmoji && "any other emoji (a server emoji works too)", !showSelfStar && "letting people star their own messages"].filter(
    (name): name is string => typeof name === "string",
  );

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
    <div className="space-y-4">
      <PanelGrid min="22rem">
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
          info="Messages that collect enough of the reaction are copied into this channel, with their author, text, first picture and a link back. It is a good home for the best drops and achievements."
        >
          <SettingRow
            title="Run the starboard"
            hint={
              draft.enabled
                ? "Messages that reach the target are copied."
                : "Nothing is copied."
            }
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            offHint="Off: nothing is copied. Your channel and rules are kept."
          >
            <FormField label="Starboard channel" size="md" as="group">
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
            size="lg"
            info={showOwnEmoji ? "Click one, or type or paste any emoji (a custom server emoji works too)." : "Click one of the usual reactions."}
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
              {showOwnEmoji && (
                <span className="w-40">
                  <input
                    className={inputClass}
                    value={draft.emoji}
                    maxLength={64}
                    aria-label="Emoji"
                    onChange={(e) => change({ emoji: e.target.value })}
                  />
                </span>
              )}
            </div>
          </FormField>
          <FormField label="Reactions needed" as="group" size="md">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={draft.maxThreshold}
                value={draft.threshold}
                aria-label="Reactions needed"
                onChange={(e) => change({ threshold: Number(e.target.value) })}
                className="min-w-0 flex-1 accent-[var(--color-gold)]"
              />
              <span className="w-8 text-center font-semibold tabular-nums">
                {draft.threshold}
              </span>
            </div>
          </FormField>
          {showSelfStar && (
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
          )}
          <section
            aria-label="Preview"
            className="max-w-xl rounded-lg border border-surface-border bg-background/40 p-4"
          >
            <h3 className="text-sm font-semibold">Preview</h3>
            <p className="mt-0.5 text-xs text-muted">
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
        </CollapsibleCard>
      </PanelGrid>

      {hidden.length > 0 && <MoreInAdvanced>{andList(hidden)}.</MoreInAdvanced>}

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
