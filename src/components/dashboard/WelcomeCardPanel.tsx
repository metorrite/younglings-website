"use client";

import { useEffect, useState, useTransition } from "react";
import { ImageUrlField, type ImageUploads } from "@/components/admin/ImageUrlField";
import { FormField, inputClass } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import type { WelcomeActionResult, WelcomeCard, WelcomeCardDraft } from "@/lib/jonnybot-admin";
import { colorToHex, hexToColor } from "@/lib/welcomePreview";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

const SAMPLE_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";
const shape = (d: WelcomeCardDraft) => JSON.stringify(d);
const toDraft = (c: WelcomeCard): WelcomeCardDraft => ({
  enabled: c.enabled,
  backgroundColor: c.backgroundColor,
  backgroundImageUrl: c.backgroundImageUrl,
  textColor: c.textColor,
  title: c.title,
  description: c.description,
});

/** The bot's variables for the card, filled for the preview the way the bot fills them for a real member. */
function fill(text: string, server: string, count: number): string {
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return text.replaceAll("{name}", "PvmRyan").replaceAll("{username}", "pvmryan").replaceAll("{server}", server).replaceAll("{count}", String(count)).replaceAll("{date}", date);
}

const VARIABLES = ["{name}", "{username}", "{server}", "{count}", "{date}"];

/**
 * The optional welcome picture, edited under the welcome message. The preview is the website's own card route, the same one the bot asks
 * for when someone joins, so what is shown here is what is sent. Off by default; classic messages only (a Container can't carry a picture).
 */
export function WelcomeCardPanel({
  initial,
  save,
  uploads,
}: {
  initial: WelcomeCard;
  save: (draft: WelcomeCardDraft) => Promise<WelcomeActionResult<WelcomeCard>>;
  uploads?: ImageUploads;
}) {
  const [saved, setSaved] = useState(() => toDraft(initial));
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [meta, setMeta] = useState({ serverName: initial.serverName, memberCount: initial.memberCount });
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(saved);
  const change = (patch: Partial<WelcomeCardDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  // the preview waits for a pause in typing, so each keystroke doesn't ask the card route for a new picture
  const [previewSrc, setPreviewSrc] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = new URLSearchParams({
        title: fill(draft.title, meta.serverName, meta.memberCount),
        description: fill(draft.description, meta.serverName, meta.memberCount),
        avatar: SAMPLE_AVATAR,
        bg: colorToHex(draft.backgroundColor).slice(1),
        color: colorToHex(draft.textColor).slice(1),
      });
      if (draft.backgroundImageUrl.trim()) q.set("image", draft.backgroundImageUrl.trim());
      setPreviewSrc(`/api/welcome-card?${q.toString()}`);
    }, 400);
    return () => clearTimeout(timer);
  }, [draft, meta]);

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save(draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(toDraft(result.data));
      setDraft(toDraft(result.data));
      setMeta({ serverName: result.data.serverName, memberCount: result.data.memberCount });
      setOutcome({ tone: "success", title: draft.enabled ? "Saved. New members' welcomes will carry the picture." : "Saved. The welcome picture is switched off." });
    });
  }

  return (
    <div className="space-y-4">
      <CollapsibleCard
        id="welcome-card"
        title="Welcome picture"
        hint="An optional card with the new member's avatar and a line of text, attached to the welcome message."
        summary={<Chip tone={draft.enabled ? "good" : "plain"}>{draft.enabled ? "On" : "Off"}</Chip>}
        info="Attached to the welcome as a picture. It only goes on Message, Embed and Embed and text welcomes: a Container can't carry one. If the picture can't be drawn in time the welcome still goes out, with a plainer card the bot draws itself."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
          <div className="min-w-0 space-y-4">
            <SettingRow title="Add a picture to the welcome" hint="Off: the welcome has no picture. Your design is kept." checked={draft.enabled} onChange={(on) => change({ enabled: on })} offHint="Off: no picture is attached.">
              {null}
            </SettingRow>
            <FieldGrid>
              <FormField label="Title" size="md" hint={`Up to 60 characters. ${VARIABLES.join(" ")}`}>
                <input className={inputClass} maxLength={60} value={draft.title} onChange={(e) => change({ title: e.target.value })} />
              </FormField>
              <FormField label="Description" size="md" hint="Up to 120 characters.">
                <input className={inputClass} maxLength={120} value={draft.description} onChange={(e) => change({ description: e.target.value })} />
              </FormField>
              <FormField label="Background colour" size="sm" as="group">
                <input type="color" aria-label="Background colour" className="h-9 w-14 cursor-pointer rounded border border-surface-border bg-background p-1" value={colorToHex(draft.backgroundColor)} onChange={(e) => change({ backgroundColor: hexToColor(e.target.value) ?? draft.backgroundColor })} />
              </FormField>
              <FormField label="Text colour" size="sm" as="group">
                <input type="color" aria-label="Text colour" className="h-9 w-14 cursor-pointer rounded border border-surface-border bg-background p-1" value={colorToHex(draft.textColor)} onChange={(e) => change({ textColor: hexToColor(e.target.value) ?? draft.textColor })} />
              </FormField>
            </FieldGrid>
            <FormField label="Background picture" size="lg" hint="Optional. Upload one or paste an https:// address; it covers the colour. Leave empty for a plain colour.">
              <ImageUrlField id="welcome-card-bg" slot="card_bg" value={draft.backgroundImageUrl} onChange={(v) => change({ backgroundImageUrl: v })} uploads={uploads} />
            </FormField>
          </div>
          <div className="min-w-0">
            <div className="xl:sticky xl:top-4">
              <h3 className="text-sm font-semibold">Preview</h3>
              <p className="mt-0.5 mb-2 text-xs text-muted">The card as it is drawn for an example member called PvmRyan.</p>
              {previewSrc && (
                // eslint-disable-next-line @next/next/no-img-element -- the card is drawn by our own route from what is typed here
                <img src={previewSrc} alt="Preview of the welcome picture" width={700} height={300} className="w-full max-w-[700px] rounded-lg border border-surface-border" />
              )}
            </div>
          </div>
        </div>
      </CollapsibleCard>
      <SaveBar pending={pending} onSave={submit} outcome={outcome} dirty={dirty} onDiscard={() => { setDraft(saved); setOutcome(null); }} />
    </div>
  );
}
