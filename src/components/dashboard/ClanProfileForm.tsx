"use client";

import { useState, useTransition } from "react";
import { FormField, ghostButton, inputClass, Notice, StatusBadge } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { andList } from "@/components/dashboard/ui/andList";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import type { ClanProfileData, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;
type Draft = Pick<
  ClanProfileData,
  "visibility" | "slug" | "displayName" | "tagline" | "description" | "logoUrl" | "colour" | "timezone" | "focus" | "recruiting" | "requirements" | "applyUrl" | "leaderboardOptIn"
>;

export interface ClanProfileActions {
  save: (draft: Draft) => Promise<WelcomeActionResult<ClanProfileData>>;
  verify: () => Promise<WelcomeActionResult<ClanProfileData>>;
}

const VISIBILITY_HELP: Record<string, string> = {
  PRIVATE: "Only your own server sees the profile. This is the default.",
  UNLISTED: "Anyone with the address can open the page, but it is not in the directory or search.",
  PUBLIC: "Shown in the clan directory and search. Needs the clan to be verified.",
};

const shape = (d: Draft) => JSON.stringify(d);
const hex = (n: number | null) => (n === null ? "#d4af37" : `#${n.toString(16).padStart(6, "0")}`);

/** The clan's public face: what it shares, who can see it, whether it is recruiting, and the check that its leader really leads it. */
export function ClanProfileForm({ initial, actions, moderationHref }: { initial: ClanProfileData; actions: ClanProfileActions; moderationHref?: string }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<Draft>(initial);
  const [meta, setMeta] = useState(initial); // the read-only facts (verification, listing) from the last response
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [verifyProblem, setVerifyProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [pending, start] = useTransition();
  const [verifying, startVerify] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const dirty = shape(draft) !== shape(saved);
  // Basic shows what most clans set; an Advanced-only option that is already saved stays in sight.
  const showTimezone = advanced || !!saved.timezone;
  const showColour = advanced || saved.colour !== null;
  const showAddress = advanced || !!saved.slug;
  const hidden = [!showTimezone && "time zone", !showColour && "accent colour", !showAddress && "the page address"].filter((n): n is string => typeof n === "string");
  const change = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await actions.save(draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setDraft(result.data);
      setMeta(result.data);
      setOutcome({ tone: "success", title: "Saved." });
    });
  }

  function verify() {
    setVerifyProblem(null);
    startVerify(async () => {
      const result = await actions.verify();
      if (!result.ok) return setVerifyProblem({ title: result.error, items: result.problems });
      setMeta(result.data);
      setSaved((s) => ({ ...s, verified: result.data.verified, verifiedClanName: result.data.verifiedClanName, listing: result.data.listing }));
    });
  }

  const listingText =
    meta.suspended
      ? "Suspended"
      : meta.listing === "LISTED"
        ? "Listed in the directory"
        : meta.listing === "UNLISTED"
          ? "Reachable by its address only"
          : "Not shown to anyone outside your server";
  const focusLabel = (key: string) => meta.options.focus.find((f) => f.key === key)?.label ?? key;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="min-w-0 space-y-4">
        <PanelGrid min="24rem">
        <CollapsibleCard
          id="cp-visibility"
          title="Who can see it"
          hint="Private, unlisted or public, and proving the clan is yours."
          defaultOpen
          summary={
            <>
              <Chip tone={meta.listing === "LISTED" ? "good" : "plain"}>{saved.visibility === "PUBLIC" ? "Public" : saved.visibility === "UNLISTED" ? "Unlisted" : "Private"}</Chip>
              <Chip tone={meta.verified ? "good" : "warn"}>{meta.verified ? "Verified" : "Not verified"}</Chip>
            </>
          }
          info="Nothing is shown outside your server until you choose unlisted or public. A public listing only ever shows clan-level facts: never your members' names or Discord details."
        >
          {meta.suspended && (
            <Notice tone="error" title="This listing is suspended by the bot's owner." items={meta.suspendedReason ? [meta.suspendedReason] : undefined} />
          )}
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Visibility">
            {meta.options.visibility.map((v) => (
              <button
                key={v.key}
                type="button"
                role="radio"
                aria-checked={draft.visibility === v.key}
                disabled={meta.suspended && v.key !== "PRIVATE"}
                onClick={() => change({ visibility: v.key as Draft["visibility"] })}
                className={`rounded-lg border p-3 text-left transition disabled:opacity-50 ${draft.visibility === v.key ? "border-gold bg-gold/10" : "border-surface-border hover:border-gold/50"}`}
              >
                <span className="block font-semibold">{v.label}</span>
                <span className="mt-1 block text-xs text-muted">{VISIBILITY_HELP[v.key]}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">
            Right now: <span className="text-foreground">{listingText}</span>.
          </p>

          <div className="rounded-lg border border-surface-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">Clan verification</p>
                <p className="text-sm text-muted">
                  {meta.currentClanName ? (
                    meta.verified ? (
                      <>
                        Verified as <span className="text-foreground">{meta.verifiedClanName}</span>.
                      </>
                    ) : (
                      <>
                        Your server is set up for the clan <span className="text-foreground">{meta.currentClanName}</span>, which is not verified yet.
                      </>
                    )
                  ) : (
                    "Set your RuneScape clan in Server setup first."
                  )}
                </p>
              </div>
              <button type="button" className={ghostButton} disabled={verifying || !meta.currentClanName} onClick={verify}>
                {verifying ? "Checking…" : meta.verified ? "Check again" : "Verify the clan"}
              </button>
            </div>
            <div className="mt-4">
              <Toggle
                checked={draft.leaderboardOptIn}
                onChange={(on) => change({ leaderboardOptIn: on })}
                label="Take part in clan leaderboards"
                detail="Your clan is ranked by the total XP its members gained. Only the total, member count and average are shown, never a member's own figure. Needs a public listing."
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              A clan Owner or Deputy Owner does this: link your RuneScape name with /rs in this server first, and JonnyBot checks your rank on the clan
              roster. Verification lasts as long as the clan set for this server stays the same.
            </p>
            {verifyProblem && (
              <div className="mt-3">
                <Notice tone="error" title={verifyProblem.title} items={verifyProblem.items} />
              </div>
            )}
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          id="cp-about"
          title="About the clan"
          hint="The name, a short line and a longer description."
          defaultOpen
          summary={<Chip>{draft.displayName || "No name yet"}</Chip>}
        >
          <FieldGrid>
            <FormField label="Name shown" size="md" hint={`Up to ${meta.limits.name} characters.`}>
              <input className={inputClass} value={draft.displayName} maxLength={meta.limits.name} placeholder={meta.suggestedName} onChange={(e) => change({ displayName: e.target.value })} />
            </FormField>
            {showTimezone && (
              <FormField label="Time zone" size="md" hint="Where your events are scheduled, e.g. America/New_York">
                <input className={inputClass} list="cp-zones" value={draft.timezone ?? ""} placeholder="Europe/London" onChange={(e) => change({ timezone: e.target.value || null })} />
                <datalist id="cp-zones">
                  {["UTC", "Europe/London", "Europe/Paris", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Australia/Sydney", "Asia/Tokyo"].map((z) => (
                    <option key={z} value={z} />
                  ))}
                </datalist>
              </FormField>
            )}
          </FieldGrid>
          <FormField label="Tagline" size="lg" hint={`One line under the name, up to ${meta.limits.tagline} characters.`}>
            <input className={inputClass} value={draft.tagline} maxLength={meta.limits.tagline} placeholder="A friendly PvM clan for everyone" onChange={(e) => change({ tagline: e.target.value })} />
          </FormField>
          <FormField label="Description" size="lg" hint={`Up to ${meta.limits.description} characters.`}>
            <textarea className={`${inputClass} min-h-32`} value={draft.description} maxLength={meta.limits.description} onChange={(e) => change({ description: e.target.value })} />
          </FormField>
          <FormField label="Logo address" size="lg" hint="A link to an image, starting with https://">
            <input className={inputClass} value={draft.logoUrl ?? ""} placeholder="https://" onChange={(e) => change({ logoUrl: e.target.value || null })} />
          </FormField>
          <FormField label="What the clan is about" as="group" size="lg" hint="Pick any that fit.">
            <div className="flex flex-wrap gap-2">
              {meta.options.focus.map((f) => {
                const on = draft.focus.includes(f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => change({ focus: on ? draft.focus.filter((k) => k !== f.key) : [...draft.focus, f.key] })}
                    className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </FormField>
          {showColour && (
          <FormField label="Accent colour" as="group">
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Accent colour"
                value={hex(draft.colour)}
                onChange={(e) => change({ colour: parseInt(e.target.value.slice(1), 16) })}
                className="h-9 w-14 cursor-pointer rounded border border-surface-border bg-transparent"
              />
              <span className="font-mono text-xs text-muted">{draft.colour === null ? "Not chosen" : hex(draft.colour)}</span>
              {draft.colour !== null && (
                <button type="button" className="text-xs text-muted hover:text-foreground" onClick={() => change({ colour: null })}>
                  Clear
                </button>
              )}
            </div>
          </FormField>
          )}
        </CollapsibleCard>

        <CollapsibleCard
          id="cp-recruiting"
          title="Recruiting"
          hint="Whether you are taking new members and what you look for."
          defaultOpen
          summary={<Chip tone={draft.recruiting === "OPEN" ? "good" : "plain"}>{meta.options.recruiting.find((r) => r.key === draft.recruiting)?.label}</Chip>}
        >
          <FormField label="Status" as="group">
            <div className="flex flex-wrap gap-2">
              {meta.options.recruiting.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={draft.recruiting === r.key}
                  onClick={() => change({ recruiting: r.key as Draft["recruiting"] })}
                  className={`rounded-md border px-4 py-2 text-sm transition ${draft.recruiting === r.key ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Requirements" size="lg" hint={`Up to ${meta.limits.requirements} characters.`}>
            <textarea
              className={`${inputClass} min-h-24`}
              value={draft.requirements}
              maxLength={meta.limits.requirements}
              placeholder="Combat level 100+, active on Discord, friendly"
              onChange={(e) => change({ requirements: e.target.value })}
            />
          </FormField>
          <FormField label="Where to apply" size="lg" hint="A Discord invite or any https:// link.">
            <input className={inputClass} value={draft.applyUrl ?? ""} placeholder="https://discord.gg/..." onChange={(e) => change({ applyUrl: e.target.value || null })} />
          </FormField>
        </CollapsibleCard>

        {showAddress && (
        <CollapsibleCard
          id="cp-address"
          title="Address"
          hint="The short name in the clan's page link."
          summary={<Chip>{draft.slug ?? "Made when you save"}</Chip>}
          info="Lower-case letters, digits and single dashes, 3 to 32 characters. Leave it empty and one is made from your name. Changing it breaks old links."
        >
          <FormField label="Address" size="md">
            <input
              className={inputClass}
              value={draft.slug ?? ""}
              maxLength={32}
              placeholder="your-clan"
              onChange={(e) => change({ slug: e.target.value.toLowerCase() || null })}
            />
          </FormField>
        </CollapsibleCard>
        )}
        </PanelGrid>
        {hidden.length > 0 && <MoreInAdvanced>{andList(hidden)}.</MoreInAdvanced>}


      </div>

      <div className="min-w-0">
        <div className="space-y-4 xl:sticky xl:top-4">
          <section className="rounded-xl border border-surface-border bg-surface p-5">
            <h2 className="font-semibold text-gold">Preview</h2>
            <p className="mt-1 text-xs text-muted">How the clan looks in the directory.</p>
            <div className="mt-3 rounded-lg border-l-4 bg-background p-4" style={{ borderLeftColor: hex(draft.colour) }}>
              <div className="flex items-start gap-3">
                {draft.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a clan's own link, previewed as typed
                  <img src={draft.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-white/10 text-lg font-semibold">{(draft.displayName || "?").charAt(0)}</div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold break-words">{draft.displayName || meta.suggestedName}</p>
                  {draft.tagline && <p className="text-sm text-muted break-words">{draft.tagline}</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <StatusBadge tone={draft.recruiting === "OPEN" ? "good" : "muted"}>{meta.options.recruiting.find((r) => r.key === draft.recruiting)?.label}</StatusBadge>
                {meta.verified && <StatusBadge tone="good">Verified</StatusBadge>}
                {draft.focus.map((k) => (
                  <StatusBadge key={k} tone="muted">
                    {focusLabel(k)}
                  </StatusBadge>
                ))}
              </div>
              {meta.memberCount > 0 && <p className="mt-3 text-xs text-muted">{meta.memberCount} members</p>}
            </div>
          </section>
          <SaveBar
          inline
          pending={pending}
          onSave={submit}
          outcome={outcome}
          dirty={dirty}
          onDiscard={() => {
            setDraft(saved);
            setOutcome(null);
          }}
        />
          {moderationHref && (
            <a href={moderationHref} className="block text-sm text-gold hover:underline">
              Moderate the directory →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
