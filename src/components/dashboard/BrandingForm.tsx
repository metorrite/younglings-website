"use client";

import { useState, useTransition } from "react";
import { FormField, inputClass, Notice } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Advanced } from "@/components/dashboard/ui/ViewMode";
import type { BotBranding, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Draft = { displayName: string; nickname: string };

const toDraft = (b: BotBranding): Draft => ({ displayName: b.displayName ?? "", nickname: b.nickname ?? "" });
const shape = (d: Draft) => JSON.stringify([d.displayName.trim(), d.nickname.trim()]);

/**
 * How JonnyBot appears in this server. Two panels: the name its messages use for the server (a display name, else the clan name, else the
 * server's name) and the bot's own nickname here. Avatar, banner and bio are for premium servers and shown under Advanced.
 */
export function BrandingForm({ initial, save }: { initial: BotBranding; save: (draft: { displayName: string | null; nickname: string | null }) => Promise<WelcomeActionResult<BotBranding>> }) {
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
      const result = await save({ displayName: draft.displayName.trim() || null, nickname: draft.nickname.trim() || null });
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
        >
          <p className="text-sm text-muted">
            {saved.premium
              ? "This server is on the premium list, so it will be able to give JonnyBot its own avatar, banner and bio here. That setting is coming next."
              : "A server avatar, banner and bio are for premium servers. Ask the bot's owner to add this server to the premium list."}
          </p>
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
