"use client";

import { useRef, useState, useTransition } from "react";
import { FormField, ghostButton, inputClass, Notice } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Advanced } from "@/components/dashboard/ui/ViewMode";
import { prepareImage } from "@/lib/imagePrep";
import type { BotBranding, BrandingSave, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
/** What is being edited. A picture is only here once one was chosen (`data`) or removal was asked for; the saved picture is never sent back. */
type Draft = { displayName: string; nickname: string; bio: string; avatar: string | null; banner: string | null; removeAvatar: boolean; removeBanner: boolean };

const toDraft = (b: BotBranding): Draft => ({ displayName: b.displayName ?? "", nickname: b.nickname ?? "", bio: b.bio ?? "", avatar: null, banner: null, removeAvatar: false, removeBanner: false });
const shape = (d: Draft) => JSON.stringify([d.displayName.trim(), d.nickname.trim(), d.bio.trim(), d.avatar !== null, d.banner !== null, d.removeAvatar, d.removeBanner]);

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** A picture to choose: what is shown now (or what was just chosen), a button to pick another, and one to remove it. */
function PictureField({ label, slot, shape: look, current, pending, removed, hasSaved, onPick, onRemove, hint }: { label: string; slot: "avatar" | "banner"; shape: "round" | "wide"; current: string | null; pending: string | null; removed: boolean; hasSaved: boolean; onPick: (dataUrl: string) => void; onRemove: () => void; hint: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = removed ? null : (pending ?? current);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return setError("Choose a PNG, JPEG, GIF or WebP picture.");
    const prepared = await prepareImage(file, slot);
    if (prepared.size > 2 * 1024 * 1024) return setError("That picture is too big. Keep it under 2 MB.");
    onPick(await readAsDataUrl(prepared));
    if (input.current) input.current.value = "";
  }

  return (
    <FormField label={label} as="group" size="lg" hint={hint}>
      <div className="flex flex-wrap items-center gap-4">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- a picture just chosen (a data URL) or Discord's own address
          <img src={shown} alt="" className={look === "round" ? "h-16 w-16 rounded-full border border-surface-border object-cover" : "h-16 w-32 rounded-lg border border-surface-border object-cover"} />
        ) : (
          <span aria-hidden className={`flex items-center justify-center border border-dashed border-surface-border text-xs text-muted ${look === "round" ? "h-16 w-16 rounded-full" : "h-16 w-32 rounded-lg"}`}>
            {hasSaved && !removed ? "Set" : "None"}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" id={`pic-${slot}`} onChange={(e) => void choose(e.target.files?.[0])} />
          <label htmlFor={`pic-${slot}`} className={`${ghostButton} cursor-pointer`}>
            {pending ? "Choose another" : hasSaved || current ? "Replace" : "Choose a picture"}
          </label>
          {(hasSaved || current || pending) && !removed && (
            <button type="button" className={ghostButton} onClick={onRemove}>
              Remove
            </button>
          )}
        </div>
      </div>
      {pending && <p className="mt-2 text-xs text-amber-300">New picture chosen. It is used once you save.</p>}
      {removed && <p className="mt-2 text-xs text-amber-300">Will be removed when you save.</p>}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </FormField>
  );
}

/**
 * How JonnyBot appears in this server. Two panels: the name its messages use for the server (a display name, else the clan name, else the
 * server's name) and the bot's own nickname here. Avatar, banner and bio are for servers on the premium list and shown under Advanced.
 */
export function BrandingForm({ initial, save }: { initial: BotBranding; save: (draft: BrandingSave & { displayName: string | null; nickname: string | null }) => Promise<WelcomeActionResult<BotBranding>> }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<Draft>(toDraft(initial));
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(toDraft(saved));
  const change = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };
  const fallbackName = saved.clanName ?? saved.serverName;
  const shownName = draft.displayName.trim() || fallbackName;
  const nicknameChanged = draft.nickname.trim() !== (saved.nickname ?? "");

  function submit() {
    setOutcome(null);
    start(async () => {
      const body: BrandingSave & { displayName: string | null; nickname: string | null } = { displayName: draft.displayName.trim() || null, nickname: draft.nickname.trim() || null };
      // The profile is sent only when it changed, so a server that is not on the premium list never trips over it.
      if (saved.premium) {
        if (draft.bio.trim() !== (saved.bio ?? "")) body.bio = draft.bio.trim();
        if (draft.avatar) body.avatar = draft.avatar;
        else if (draft.removeAvatar) body.removeAvatar = true;
        if (draft.banner) body.banner = draft.banner;
        else if (draft.removeBanner) body.removeBanner = true;
      }
      const result = await save(body);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setDraft(toDraft(result.data));
      setOutcome({ tone: "success", title: "Saved." });
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="26rem">
        <CollapsibleCard
          id="branding-name"
          title="Name in messages"
          hint="What JonnyBot calls your server or clan."
          defaultOpen
          summary={<Chip>{shownName}</Chip>}
          info="Panels, notifications and messages that name the server use this. Leave it empty and JonnyBot uses your clan name, or your Discord server's name when there is no clan."
        >
          <FormField label="Display name" size="md" hint={`Up to ${saved.maxDisplayName} characters. Leave empty to use “${fallbackName}”.`}>
            <input className={inputClass} value={draft.displayName} maxLength={saved.maxDisplayName} placeholder={fallbackName} onChange={(e) => change({ displayName: e.target.value })} />
          </FormField>
          <p className="max-w-md rounded-lg border border-surface-border bg-background/40 px-3 py-2 text-sm text-muted">
            Messages will say <span className="font-semibold text-foreground">{shownName}</span>, like “{shownName} Teamforming” on a role panel.
          </p>
        </CollapsibleCard>

        <CollapsibleCard
          id="branding-nickname"
          title="Nickname in this server"
          hint="Rename JonnyBot here, for this server only."
          defaultOpen
          summary={<Chip tone={saved.nickname ? "good" : "plain"}>{saved.nickname ?? saved.botName}</Chip>}
          info="Discord shows this name beside the bot's messages and in the member list, in this server only. Clear it to go back to the bot's normal name."
        >
          {!saved.canChangeNickname && (
            <Notice tone="error" title="JonnyBot can't rename itself here yet." items={["Give its role the Change Nickname permission in Server Settings, then Roles, and come back."]} />
          )}
          <FormField label="Nickname" size="md" hint={`Up to ${saved.maxNickname} characters. Leave empty for “${saved.botName}”.`}>
            <input className={inputClass} value={draft.nickname} maxLength={saved.maxNickname} placeholder={saved.botName} disabled={!saved.canChangeNickname && !saved.nickname} onChange={(e) => change({ nickname: e.target.value })} />
          </FormField>
          {nicknameChanged && !saved.canChangeNickname && <p className="text-xs text-amber-300">It can only be saved once the permission is given.</p>}
        </CollapsibleCard>
      </PanelGrid>

      <Advanced>
        <CollapsibleCard
          id="branding-images"
          title="Avatar, banner and bio"
          hint="A picture and profile of its own in this server."
          summary={<Chip tone={saved.premium ? "good" : "plain"}>{saved.premium ? "Premium server" : "Premium only"}</Chip>}
          info="Shown on JonnyBot's profile card in this server only. Other servers keep the normal ones."
        >
          {!saved.premium ? (
            <p className="text-sm text-muted">A server avatar, banner and bio are for premium servers. Ask the bot&apos;s owner to add this server to the premium list.</p>
          ) : (
            <>
              <PictureField
                label="Avatar"
                slot="avatar"
                shape="round"
                current={saved.avatarUrl}
                pending={draft.avatar}
                removed={draft.removeAvatar}
                hasSaved={!!saved.avatarUrl}
                hint="A square picture works best. PNG, JPEG, GIF or WebP, up to 2 MB."
                onPick={(data) => change({ avatar: data, removeAvatar: false })}
                onRemove={() => change({ avatar: null, removeAvatar: !!saved.avatarUrl })}
              />
              <PictureField
                label="Banner"
                slot="banner"
                shape="wide"
                current={null}
                pending={draft.banner}
                removed={draft.removeBanner}
                hasSaved={saved.bannerSet}
                hint="A wide picture behind the profile card. Discord doesn't show an uploaded banner back, so it appears as “Set”."
                onPick={(data) => change({ banner: data, removeBanner: false })}
                onRemove={() => change({ banner: null, removeBanner: saved.bannerSet })}
              />
              <FormField label="Bio" size="lg" hint={`Up to ${saved.maxBio} characters. Shown on the profile card.`}>
                <textarea className={`${inputClass} min-h-24`} value={draft.bio} maxLength={saved.maxBio} onChange={(e) => change({ bio: e.target.value })} />
              </FormField>
            </>
          )}
        </CollapsibleCard>
      </Advanced>

      <p className="text-xs text-muted">JonnyBot&apos;s status (the line under its name) is the same in every server. The bot&apos;s owner sets it.</p>

      <SaveBar
        pending={pending}
        onSave={submit}
        outcome={outcome}
        dirty={dirty}
        onDiscard={() => {
          setDraft(toDraft(saved));
          setOutcome(null);
        }}
      />
    </div>
  );
}
