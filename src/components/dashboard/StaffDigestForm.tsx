"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { FormField, ghostButton, inputClass, Notice } from "@/components/admin/ui";
import { ChannelSelect } from "@/components/admin/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import type { GuildStructure, StaffDigest, StaffDigestSettings, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Draft = Omit<StaffDigestSettings, "lastPostedOn">;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const shape = (d: Draft) => JSON.stringify([d.enabled, d.channelId, d.weekday, d.hour]);
const draftOf = (s: StaffDigestSettings): Draft => ({ enabled: s.enabled, channelId: s.channelId, weekday: s.weekday, hour: s.hour });

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/**
 * The weekly staff digest (T-193): the switch, the staff channel, the day and hour, what a digest posted now would say (the same figures, each
 * linked to its page), and "Send now".
 */
export function StaffDigestForm({
  initial,
  structure,
  links,
  save,
  send,
}: {
  initial: StaffDigest;
  structure: GuildStructure;
  links: { attention: string; tickets: string; events: string };
  save: (draft: Draft) => Promise<WelcomeActionResult<StaffDigest>>;
  send: () => Promise<WelcomeActionResult<StaffDigest>>;
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
      setOutcome({ tone: "success", title: result.data.settings.enabled ? `Saved. It posts every ${DAYS[result.data.settings.weekday - 1]} from ${String(result.data.settings.hour).padStart(2, "0")}:00 UTC.` : "Saved. The staff digest is off." });
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

  const p = data.preview;
  return (
    <div className="space-y-4">
      <PanelGrid min="22rem">
        <CollapsibleCard
          id="staff-digest-on"
          title="Weekly digest"
          hint="Switch it on, and say where and when."
          defaultOpen
          summary={
            <>
              <Chip tone={draft.enabled ? "good" : "bad"}>{draft.enabled ? "On" : "Off"}</Chip>
              <Chip>{DAYS[draft.weekday - 1]} {String(draft.hour).padStart(2, "0")}:00 UTC</Chip>
            </>
          }
          info="One post a week, nobody pinged. Pick a channel only staff can read: it names how many members are inactive or unverified, and how many tickets are open."
        >
          <SettingRow title="Post a staff digest" hint={draft.enabled ? "Posts once a week." : "Nothing is posted."} checked={draft.enabled} onChange={(on) => change({ enabled: on })} offHint="Off: no weekly post.">
            <FormField label="Staff channel" size="md">
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
            <FormField label="From (UTC)" size="sm" info="The digest goes out within 15 minutes of this hour.">
              <select className={inputClass} value={draft.hour} onChange={(e) => change({ hour: Number(e.target.value) })}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </FormField>
          </SettingRow>
        </CollapsibleCard>
      </PanelGrid>

      <SaveBar pending={pending} onSave={submit} outcome={outcome} dirty={dirty} onDiscard={() => setDraft(draftOf(data.settings))} />

      <section className="rounded-xl border border-surface-border bg-surface p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">What it would say now</h2>
          <span className="text-sm text-muted">{data.settings.lastPostedOn ? `Last posted ${shortDay(data.settings.lastPostedOn)}` : "Not posted yet"}</span>
        </div>
        <dl className="mt-3 space-y-3 text-sm">
          {p.rosterSize > 0 && (
            <div>
              <dt className="font-medium">
                Clan <Link href={links.attention} className="text-xs font-normal text-gold hover:underline">Needs attention →</Link>
              </dt>
              <dd className="text-muted">
                {p.rosterSize} members · {p.inactive} inactive 30+ days · {p.unverified} unverified · {p.promotionsDue} {p.promotionsDue === 1 ? "promotion" : "promotions"} due
                {p.stale > 0 ? ` · ${p.stale} not refreshed lately` : ""}
              </dd>
            </div>
          )}
          {p.openTickets !== null && (
            <div>
              <dt className="font-medium">
                Tickets <Link href={links.tickets} className="text-xs font-normal text-gold hover:underline">Tickets →</Link>
              </dt>
              <dd className="text-muted">
                {p.openTickets} open{p.escalated ? ` (${p.escalated} escalated)` : ""}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-medium">
              Coming up (7 days) <Link href={links.events} className="text-xs font-normal text-gold hover:underline">Discord events →</Link>
            </dt>
            <dd className="text-muted">
              {p.events.length === 0 ? (
                "Nothing scheduled."
              ) : (
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {p.events.slice(0, p.maxEvents).map((e) => (
                    <li key={`${e.name}-${e.start}`}>
                      {e.name} · {when(e.start)}
                    </li>
                  ))}
                  {p.events.length > p.maxEvents && <li className="list-none">…and {p.events.length - p.maxEvents} more.</li>}
                </ul>
              )}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={ghostButton} disabled={pending || !data.settings.channelId} onClick={sendNow}>
            Send now
          </button>
          <span className="text-xs text-muted">{data.settings.channelId ? "Posts it in the saved channel straight away." : "Save a channel first."}</span>
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
