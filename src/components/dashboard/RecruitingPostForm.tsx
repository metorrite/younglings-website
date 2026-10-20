"use client";

import { useState, useTransition } from "react";
import { FormField, inputClass } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import type { ClanRecruitingData, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Draft = Pick<ClanRecruitingData, "post" | "applyFormId" | "inviteUrl">;

/**
 * The clan's recruiting post on the Clans Hub (T-070): what it is looking for, the web form the hub's Apply button opens (sending it opens a
 * ticket for staff), and the Discord invite applicants get first (a web form only takes answers from members of the server).
 */
export function RecruitingPostForm({
  initial,
  formsHref,
  recruitingOpen,
  save,
}: {
  initial: ClanRecruitingData;
  formsHref: string;
  /** Whether the profile says the clan is recruiting: Apply only shows on the hub while it is. */
  recruitingOpen: boolean;
  save: (draft: Draft) => Promise<WelcomeActionResult<ClanRecruitingData>>;
}) {
  const [data, setData] = useState(initial);
  const [saved, setSaved] = useState<Draft>({ post: initial.post, applyFormId: initial.applyFormId, inviteUrl: initial.inviteUrl });
  const [draft, setDraft] = useState<Draft>(saved);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const change = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };
  const chosen = data.forms.find((f) => f.id === draft.applyFormId);
  const ready = Boolean(saved.applyFormId || saved.inviteUrl);

  function submit() {
    start(async () => {
      const result = await save(draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setData(result.data);
      const next = { post: result.data.post, applyFormId: result.data.applyFormId, inviteUrl: result.data.inviteUrl };
      setSaved(next);
      setDraft(next);
      setOutcome({ tone: "success", title: "Saved." });
    });
  }

  return (
    <CollapsibleCard
      id="cp-recruiting"
      title="Recruiting post"
      hint="What you're looking for, and how people apply from the Clans Hub."
      summary={<Chip tone={ready && recruitingOpen ? "good" : "plain"}>{ready ? (recruitingOpen ? "Apply is on" : "Set, not recruiting") : "Not set"}</Chip>}
      info="On your hub page this shows as 'What they're looking for' with an Apply button. Applicants join your Discord with the invite, then send your application form; your staff get it as a ticket. Apply only shows while your profile says you are recruiting."
    >
      <FormField label="What you're looking for" hint={`Up to ${data.maxPost} characters. Plain text.`}>
        <textarea className={`${inputClass} min-h-28`} maxLength={data.maxPost} value={draft.post} onChange={(e) => change({ post: e.target.value })} />
      </FormField>
      <FormField label="Application form" hint={data.forms.length === 0 ? "You have no web forms yet: make one on the Web forms page." : "Sending it opens a ticket for your staff."}>
        <select className={inputClass} value={draft.applyFormId ?? ""} onChange={(e) => change({ applyFormId: e.target.value || null })}>
          <option value="">None</option>
          {data.forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
              {f.enabled ? "" : " (switched off)"}
            </option>
          ))}
        </select>
      </FormField>
      {chosen && !chosen.enabled && <p className="text-sm text-amber-300">That form is switched off, so applicants won&apos;t see it. Switch it on on the Web forms page.</p>}
      <a href={formsHref} className="text-sm text-gold underline">
        Open Web forms
      </a>
      <FormField label="Discord invite" hint="Shown to applicants first, so they can join before applying. A permanent invite works best.">
        <input className={inputClass} placeholder="https://discord.gg/..." value={draft.inviteUrl ?? ""} onChange={(e) => change({ inviteUrl: e.target.value || null })} />
      </FormField>
      <SaveBar inline pending={pending} onSave={submit} outcome={outcome} dirty={dirty} onDiscard={() => setDraft(saved)} label="Save recruiting post" />
    </CollapsibleCard>
  );
}
