"use client";

import { useState, useTransition } from "react";
import { FormField, ghostButton, inputClass, Notice } from "@/components/admin/ui";
import { ChannelSelect } from "@/components/admin/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import type { Anniversaries, AnniversarySettings, GuildStructure, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Draft = Omit<AnniversarySettings, "lastPostedOn">;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const shape = (d: Draft) => JSON.stringify([d.enabled, d.channelId, d.weekday, d.hour, d.minYears]);
const draftOf = (s: AnniversarySettings): Draft => ({ enabled: s.enabled, channelId: s.channelId, weekday: s.weekday, hour: s.hour, minYears: s.minYears });

/** "Thu 24 Oct" for a yyyy-mm-dd day. */
function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/**
 * Clan anniversaries (T-194): the switch, where and when the weekly post goes, the fewest years worth a mention, a preview of who the coming
 * week's post would name, and "Send now".
 */
export function AnniversariesForm({
  initial,
  structure,
  save,
  send,
}: {
  initial: Anniversaries;
  structure: GuildStructure;
  save: (draft: Draft) => Promise<WelcomeActionResult<Anniversaries>>;
  send: () => Promise<WelcomeActionResult<Anniversaries>>;
}) {
  const [data, setData] = useState(initial);
  const [draft, setDraft] = useState(draftOf(initial.settings));
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [sendOutcome, setSendOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(draftOf(data.settings));
  const change = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save(draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setData(result.data);
      setDraft(draftOf(result.data.settings));
      setOutcome({ tone: "success", title: result.data.settings.enabled ? `Saved. It posts every ${DAYS[result.data.settings.weekday - 1]} from ${String(result.data.settings.hour).padStart(2, "0")}:00 UTC.` : "Saved. The weekly post is off." });
    });
  }

  function sendNow() {
    setSendOutcome(null);
    start(async () => {
      const result = await send();
      if (!result.ok) return setSendOutcome({ tone: "error", title: result.error, items: result.problems });
      setData(result.data);
      setSendOutcome({ tone: "success", title: "Posted." });
    });
  }

  const items = data.preview.items;
  return (
    <div className="space-y-4">
      {!data.hasRoster && (
        <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          This server has no clan roster yet, so there are no join dates to celebrate. Set up the clan on the Server setup page first.
        </p>
      )}
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="anniversaries-on"
          title="Weekly post"
          hint="Switch it on, and say where and when."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.enabled ? "good" : "bad"}>{draft.enabled ? "On" : "Off"}</Chip>
              <Chip>{DAYS[draft.weekday - 1]} {String(draft.hour).padStart(2, "0")}:00 UTC</Chip>
            </>
          }
          info="Names are written as text, so nobody is pinged. A week with nobody to celebrate posts nothing. Join dates come from the in-game clan, so members whose join date isn't known are left out."
        >
          <SettingRow
            title="Post clan anniversaries"
            hint={draft.enabled ? "Posts once a week." : "Nothing is posted."}
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            offHint="Off: no weekly post."
          >
            <FormField label="Channel" size="md">
              <ChannelSelect channels={structure.channels} value={draft.channelId} onChange={(id) => change({ channelId: id })} onlyPostable allowForums={false} none="Pick a channel" />
            </FormField>
            <FormField label="Day" size="sm">
              <select className={inputClass} value={draft.weekday} onChange={(e) => change({ weekday: Number(e.target.value) })}>
                {DAYS.map((d, i) => (
                  <option key={d} value={i + 1}>
                    {d}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="From (UTC)" size="sm" info="The post goes out within 15 minutes of this hour.">
              <select className={inputClass} value={draft.hour} onChange={(e) => change({ hour: Number(e.target.value) })}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Fewest years" size="sm" info="1 names everyone from their first year; 5 only names 5, 6, 7… years.">
              <input
                type="number"
                className={inputClass}
                min={1}
                max={data.limits.maxMinYears}
                value={draft.minYears}
                onChange={(e) => change({ minYears: Math.max(1, Math.min(data.limits.maxMinYears, Math.trunc(Number(e.target.value) || 1))) })}
              />
            </FormField>
          </SettingRow>
        </CollapsibleCard>
      </PanelGrid>

      <SaveBar pending={pending} onSave={submit} outcome={outcome} dirty={dirty} onDiscard={() => setDraft(draftOf(data.settings))} />

      <section className="rounded-xl border border-surface-border bg-surface p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">The coming week</h2>
          <span className="text-sm text-muted">
            {shortDay(data.preview.from)} to {shortDay(data.preview.to)}
          </span>
        </div>
        <p className="mb-3 text-sm text-muted">
          Who a post today would name (saved settings). {data.settings.lastPostedOn ? `Last posted ${shortDay(data.settings.lastPostedOn)}.` : "Not posted yet."}
        </p>
        {items.length === 0 ? (
          <p className="text-sm text-muted">Nobody reaches an anniversary in these seven days.</p>
        ) : (
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {items.map((a) => (
              <li key={a.rsn} className="flex items-baseline justify-between gap-3 border-b border-surface-border/40 py-1 text-sm">
                <span className="font-medium">{a.rsn}</span>
                <span className="text-xs text-muted">
                  {a.years} {a.years === 1 ? "year" : "years"} · {shortDay(a.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={ghostButton} disabled={pending || items.length === 0 || !data.settings.channelId} onClick={sendNow}>
            Send now
          </button>
          <span className="text-xs text-muted">{data.settings.channelId ? "Posts this list in the saved channel straight away." : "Save a channel first."}</span>
        </div>
        {sendOutcome && (
          <div className="mt-3">
            <Notice tone={sendOutcome.tone} title={sendOutcome.title} items={sendOutcome.items} />
          </div>
        )}
      </section>
    </div>
  );
}
