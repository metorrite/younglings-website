"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, inputClass } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { choicesOf, type GuildStructure, type VoiceText, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Draft = Pick<VoiceText, "enabled" | "announce" | "purgeWhenEmpty"> & { links: { voiceChannelId: string; textChannelId: string }[] };

const toDraft = (v: VoiceText): Draft => ({ enabled: v.enabled, announce: v.announce, purgeWhenEmpty: v.purgeWhenEmpty, links: v.links.map((l) => ({ voiceChannelId: l.voiceChannelId, textChannelId: l.textChannelId })) });
const shape = (d: Draft) => JSON.stringify([d.enabled, d.announce, d.purgeWhenEmpty, d.links]);

/**
 * Pairs voice channels with text channels: while someone is in the voice channel they can see and write in its text channel, and lose that when they leave.
 * Basic is the switch and the pairs; Advanced adds saying who joined and left, and clearing the text channel when the voice channel empties (both stay visible
 * once on). Hide the text channel from @everyone first, or everybody can already see it.
 */
export function VoiceTextForm({
  initial,
  structure,
  save,
}: {
  initial: VoiceText;
  structure: GuildStructure;
  save: (draft: Draft) => Promise<WelcomeActionResult<VoiceText>>;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<Draft>(toDraft(initial));
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const showExtras = advanced || saved.announce || saved.purgeWhenEmpty;
  const dirty = shape(draft) !== shape(toDraft(saved));
  const change = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };
  const setLink = (i: number, patch: Partial<Draft["links"][number]>) => change({ links: draft.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const textChannels = structure.channels;
  const everyoneSees = new Set(saved.links.filter((l) => l.everyoneCanSee).map((l) => l.textChannelId));

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save({ ...draft, links: draft.links.filter((l) => l.voiceChannelId && l.textChannelId) });
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setDraft(toDraft(result.data));
      setOutcome({ tone: "success", title: draft.enabled ? "Saved. People in these voice channels now get their text channel." : "Saved. Voice text is switched off." });
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="24rem">
        <CollapsibleCard
          id="vt-pairs"
          title="Voice and text pairs"
          hint="Which text channel each voice channel opens."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.enabled ? "good" : "plain"}>{draft.enabled ? "On" : "Off"}</Chip>
              <Chip>{draft.links.length} pair{draft.links.length === 1 ? "" : "s"}</Chip>
            </>
          }
          info="While a person is in the voice channel, JonnyBot gives them their own View, Send Messages and Read History permissions in the paired text channel, and takes exactly that away when they leave. Only access JonnyBot added is removed, never a permission someone set by hand. JonnyBot needs View Channel, Send Messages and Manage Permissions in the text channel. A text channel can belong to one voice channel only."
        >
          <SettingRow
            title="Link voice and text channels"
            hint={draft.enabled ? "People get the text channel while they are in voice." : "Nothing happens when people join voice channels."}
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            offHint="Off: nobody gets access. Your pairs are kept."
          >
            <div className="space-y-3">
              {draft.links.map((link, i) => {
                const problem = saved.links.find((l) => l.voiceChannelId === link.voiceChannelId && l.textChannelId === link.textChannelId)?.problem;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <select className={`${inputClass} max-w-56`} aria-label="Voice channel" value={link.voiceChannelId} onChange={(e) => setLink(i, { voiceChannelId: e.target.value })}>
                        <option value="">Voice channel…</option>
                        {saved.voiceChannels.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                      <span className="text-muted" aria-hidden="true">opens</span>
                      <span className="min-w-48 flex-1">
                        <ChannelSelect {...choicesOf({ ...structure, channels: textChannels })} allowForums={false} value={link.textChannelId || null} onChange={(id) => setLink(i, { textChannelId: id ?? "" })} none="Text channel…" />
                      </span>
                      <button type="button" className="rounded-full border border-surface-border px-3 py-1 text-xs text-muted transition hover:text-foreground" onClick={() => change({ links: draft.links.filter((_, j) => j !== i) })}>
                        Remove
                      </button>
                    </div>
                    {problem && <p className="text-xs text-amber-300">{problem}</p>}
                    {link.textChannelId && everyoneSees.has(link.textChannelId) && (
                      <p className="text-xs text-amber-300">Everyone can already see this text channel. Hide it from @everyone in Discord, or the link changes nothing.</p>
                    )}
                  </div>
                );
              })}
              {draft.links.length === 0 && <p className="text-xs text-muted">No pairs yet.</p>}
              {draft.links.length < saved.maxLinks && (
                <button type="button" className="rounded-full border border-surface-border px-3 py-1 text-xs text-muted transition hover:text-foreground" onClick={() => change({ links: [...draft.links, { voiceChannelId: "", textChannelId: "" }] })}>
                  Add a pair
                </button>
              )}
            </div>
          </SettingRow>
        </CollapsibleCard>

        {showExtras && (
          <CollapsibleCard
            id="vt-extras"
            title="Extras"
            hint="Say who joined and left, and tidy up when it empties."
            defaultOpen
            summary={<Chip>{[draft.announce && "Announces", draft.purgeWhenEmpty && "Clears when empty"].filter(Boolean).join(" · ") || "Nothing extra"}</Chip>}
          >
            <Toggle
              checked={draft.announce}
              onChange={(on) => change({ announce: on })}
              label="Say when someone joins or leaves the voice channel"
              detail="A short line in the text channel. Nobody is mentioned."
            />
            <Toggle
              checked={draft.purgeWhenEmpty}
              onChange={(on) => change({ purgeWhenEmpty: on })}
              label="Clear the text channel when the voice channel is empty"
              detail="Deletes the newest 100 unpinned messages from the last two weeks in the paired text channel (never the channel itself). Needs Manage Messages there. Deleted messages can't be recovered."
            />
            {draft.purgeWhenEmpty && <FormField label="" size="full"><p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">Only pair channels that are meant to be throwaway chat with this on.</p></FormField>}
          </CollapsibleCard>
        )}
      </PanelGrid>

      {!showExtras && <MoreInAdvanced>saying who joined and left, and clearing the text channel when the voice channel empties.</MoreInAdvanced>}

      <SaveBar pending={pending} onSave={submit} outcome={outcome} dirty={dirty} onDiscard={() => { setDraft(toDraft(saved)); setOutcome(null); }} />
    </div>
  );
}
