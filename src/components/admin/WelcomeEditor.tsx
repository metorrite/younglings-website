"use client";

import { useState, useTransition } from "react";
import { saveWelcomeAction, testWelcomeAction } from "@/app/admin/(console)/welcome/actions";
import { DiscordText } from "@/components/site/DiscordText";
import type { GuildStructure, WelcomeConfig, WelcomeDraft, WelcomeField, WelcomeMessageType } from "@/lib/jonnybot-admin";
import { colorToHex, fillPreview, hexToColor, WELCOME_VARIABLES, type PreviewSample } from "@/lib/welcomePreview";
import { Card, FormField, ghostButton, inputClass, Notice, primaryButton } from "./ui";

// Discord's limits, as the bot enforces them (WelcomeValidator), so the counters turn red before a save would be refused.
const MAX = { content: 1800, title: 256, description: 3900, author: 256, footer: 2048, fieldName: 256, fieldValue: 1024, fields: 25 };

const TYPES: { id: WelcomeMessageType; label: string; hint: string }[] = [
  { id: "MESSAGE", label: "Message", hint: "Just a line of text." },
  { id: "EMBED", label: "Embed", hint: "Just the boxed embed." },
  { id: "EMBED_TEXT", label: "Embed and text", hint: "A line of text above the embed." },
];

function toDraft(c: WelcomeConfig): WelcomeDraft {
  const { channelName, serverName, memberCount, serverIconUrl, ...draft } = c;
  void channelName;
  void serverName;
  void memberCount;
  void serverIconUrl;
  return draft;
}

function Counter({ value, max }: { value: string; max: number }) {
  return <span className={`text-xs tabular-nums ${value.length > max ? "text-red-400" : "text-muted"}`}>{value.length}/{max}</span>;
}

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

export function WelcomeEditor({ initial, channels }: { initial: WelcomeConfig; channels: GuildStructure["channels"] }) {
  const [draft, setDraft] = useState<WelcomeDraft>(() => toDraft(initial));
  const [meta, setMeta] = useState({ serverName: initial.serverName, memberCount: initial.memberCount });
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();

  // which detail sections start open: the ones that already have something in them
  const [open] = useState(() => ({
    author: !!(initial.authorName || initial.authorIconUrl),
    images: !!(initial.thumbnailUrl || initial.imageUrl),
    footer: !!(initial.footerText || initial.footerIconUrl),
    fields: initial.fields.length > 0,
  }));

  function set<K extends keyof WelcomeDraft>(key: K, value: WelcomeDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setOutcome(null);
  }

  function setField(index: number, patch: Partial<WelcomeField>) {
    set("fields", draft.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  const hasText = draft.messageType !== "EMBED";
  const hasEmbed = draft.messageType !== "MESSAGE";
  const channel = channels.find((c) => c.id === draft.channelId);
  const sample: PreviewSample = {
    username: "PvmRyan",
    server: meta.serverName || "Your server",
    channel: channel?.name ?? initial.channelName ?? "welcome",
    count: meta.memberCount,
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
  };

  function save() {
    setOutcome(null);
    start(async () => {
      const result = await saveWelcomeAction(draft);
      if (!result.ok) {
        setOutcome({ tone: "error", title: result.error, items: result.problems });
        return;
      }
      setDraft(toDraft(result.data));
      setMeta({ serverName: result.data.serverName, memberCount: result.data.memberCount });
      setOutcome({ tone: "success", title: draft.enabled ? "Saved. New members will be welcomed." : "Saved. The welcome is switched off, so nothing will be sent yet." });
    });
  }

  function sendTest() {
    setOutcome(null);
    start(async () => {
      const result = await testWelcomeAction(draft);
      if (!result.ok) {
        setOutcome({ tone: "error", title: result.error, items: result.problems });
        return;
      }
      const dm = draft.alsoDm ? (result.data.dmSent ? " A copy was also sent to you by DM." : " It couldn't be sent to you by DM (your DMs may be closed).") : "";
      setOutcome({ tone: "success", title: `Test posted in #${result.data.channelName}.${dm} Delete it there when you've had a look.` });
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
      <div className="min-w-0 space-y-6">
        <Card title="Delivery" hint="Where the welcome goes. The channel always gets it; a DM is sent as well when you ask for one and the member's DMs are open.">
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-gold)]" checked={draft.enabled} onChange={(e) => set("enabled", e.target.checked)} />
            <span>
              <span className="text-sm font-medium">Welcome new members</span>
              <span className="block text-xs text-muted">If Dyno&apos;s Welcome module is still on, turn it off when you switch this on, or each new member is greeted twice.</span>
            </span>
          </label>

          <fieldset>
            <legend className="text-sm font-medium">Message type</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {TYPES.map((t) => (
                <label key={t.id} className={`flex cursor-pointer flex-col rounded-md border px-3 py-2 text-sm ${draft.messageType === t.id ? "border-gold bg-gold/10" : "border-surface-border bg-background/40"}`}>
                  <span className="flex items-center gap-2 font-medium">
                    <input type="radio" name="welcome-type" className="accent-[var(--color-gold)]" checked={draft.messageType === t.id} onChange={() => set("messageType", t.id)} />
                    {t.label}
                  </span>
                  <span className="mt-0.5 text-xs text-muted">{t.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <FormField label="Welcome channel" hint="Only channels JonnyBot can post in are listed.">
            <select id="welcome-channel" className={inputClass} value={draft.channelId ?? ""} onChange={(e) => set("channelId", e.target.value || null)}>
              <option value="">Choose a channel…</option>
              {draft.channelId && !channel && <option value={draft.channelId}>{initial.channelName ? `#${initial.channelName} (JonnyBot can't post here now)` : "A channel that no longer exists"}</option>}
              {channels.filter((c) => c.canPost).map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                  {c.category ? ` (${c.category})` : ""}
                </option>
              ))}
            </select>
          </FormField>

          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-gold)]" checked={draft.alsoDm} onChange={(e) => set("alsoDm", e.target.checked)} />
            <span>
              <span className="text-sm font-medium">Also send a copy by DM</span>
              <span className="block text-xs text-muted">Skipped quietly if the member has DMs closed. The DM never has the link button, since that button only works inside the server.</span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-gold)]" checked={draft.linkButton} onChange={(e) => set("linkButton", e.target.checked)} />
            <span>
              <span className="text-sm font-medium">Add a “link your RuneScape name” button</span>
              <span className="block text-xs text-muted">Opens the same flow as /rs, so a new member can start verification from the welcome.</span>
            </span>
          </label>
          {draft.linkButton && (
            <FormField label="Button label">
              <input id="welcome-button-label" className={inputClass} value={draft.linkButtonLabel} maxLength={80} onChange={(e) => set("linkButtonLabel", e.target.value)} />
            </FormField>
          )}
        </Card>

        {hasText && (
          <Card title="Message text" hint="The plain line above the embed. Markdown works, and so do the variables below.">
            <FormField label="Text">
              <textarea id="welcome-content" className={`${inputClass} min-h-28`} rows={4} value={draft.content} onChange={(e) => set("content", e.target.value)} placeholder="Welcome to **{server}**, {user} 👋" />
            </FormField>
            <div className="text-right">
              <Counter value={draft.content} max={MAX.content} />
            </div>
          </Card>
        )}

        {hasEmbed && (
          <Card title="Embed" hint="Every part is optional.">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">Colour</span>
              <input
                id="welcome-color"
                type="color"
                aria-label="Embed colour"
                className="h-9 w-14 cursor-pointer rounded border border-surface-border bg-background p-1"
                value={colorToHex(draft.color)}
                onChange={(e) => set("color", hexToColor(e.target.value))}
              />
              <span className="font-mono text-xs text-muted">{draft.color === null ? "none" : colorToHex(draft.color)}</span>
              {draft.color !== null && (
                <button type="button" className={ghostButton} onClick={() => set("color", null)}>
                  No colour
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Title">
                <input id="welcome-title" className={inputClass} value={draft.title} onChange={(e) => set("title", e.target.value)} />
                <Counter value={draft.title} max={MAX.title} />
              </FormField>
              <FormField label="Title link" hint="Optional. Makes the title clickable.">
                <input id="welcome-title-url" className={inputClass} value={draft.titleUrl} placeholder="https://" onChange={(e) => set("titleUrl", e.target.value)} />
              </FormField>
            </div>

            <FormField label="Description">
              <textarea id="welcome-description" className={`${inputClass} min-h-32`} rows={6} value={draft.description} onChange={(e) => set("description", e.target.value)} />
              <Counter value={draft.description} max={MAX.description} />
            </FormField>

            <details className="rounded-md border border-surface-border bg-background/40 p-3" open={open.author}>
              <summary className="cursor-pointer text-sm font-medium">Author</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <FormField label="Author name">
                  <input id="welcome-author" className={inputClass} value={draft.authorName} onChange={(e) => set("authorName", e.target.value)} />
                </FormField>
                <FormField label="Author icon" hint="A picture address. Needs an author name.">
                  <input id="welcome-author-icon" className={inputClass} value={draft.authorIconUrl} placeholder="https://" onChange={(e) => set("authorIconUrl", e.target.value)} />
                </FormField>
              </div>
            </details>

            <details className="rounded-md border border-surface-border bg-background/40 p-3" open={open.images}>
              <summary className="cursor-pointer text-sm font-medium">Image and thumbnail</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <FormField label="Thumbnail" hint="The small picture top right. {avatar} uses the new member's.">
                  <input id="welcome-thumbnail" className={inputClass} value={draft.thumbnailUrl} placeholder="https://" onChange={(e) => set("thumbnailUrl", e.target.value)} />
                </FormField>
                <FormField label="Image" hint="The large picture at the bottom.">
                  <input id="welcome-image" className={inputClass} value={draft.imageUrl} placeholder="https://" onChange={(e) => set("imageUrl", e.target.value)} />
                </FormField>
              </div>
            </details>

            <details className="rounded-md border border-surface-border bg-background/40 p-3" open={open.footer}>
              <summary className="cursor-pointer text-sm font-medium">Footer</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <FormField label="Footer text">
                  <input id="welcome-footer" className={inputClass} value={draft.footerText} onChange={(e) => set("footerText", e.target.value)} />
                </FormField>
                <FormField label="Footer icon" hint="Needs footer text.">
                  <input id="welcome-footer-icon" className={inputClass} value={draft.footerIconUrl} placeholder="https://" onChange={(e) => set("footerIconUrl", e.target.value)} />
                </FormField>
              </div>
            </details>

            <details className="rounded-md border border-surface-border bg-background/40 p-3" open={open.fields}>
              <summary className="cursor-pointer text-sm font-medium">Fields ({draft.fields.length})</summary>
              <div className="mt-3 space-y-3">
                {draft.fields.map((field, i) => (
                  <div key={i} className="space-y-2 rounded-md border border-surface-border p-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <input aria-label={`Field ${i + 1} name`} className={inputClass} placeholder="Field name" value={field.name} onChange={(e) => setField(i, { name: e.target.value })} />
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="accent-[var(--color-gold)]" checked={field.inline} onChange={(e) => setField(i, { inline: e.target.checked })} />
                        Inline
                      </label>
                    </div>
                    <textarea aria-label={`Field ${i + 1} value`} className={`${inputClass} min-h-16`} rows={2} placeholder="Field value" value={field.value} onChange={(e) => setField(i, { value: e.target.value })} />
                    <button type="button" className={ghostButton} onClick={() => set("fields", draft.fields.filter((_, j) => j !== i))}>
                      Remove field
                    </button>
                  </div>
                ))}
                {draft.fields.length < MAX.fields && (
                  <button type="button" className={ghostButton} onClick={() => set("fields", [...draft.fields, { name: "", value: "", inline: false }])}>
                    + Add field
                  </button>
                )}
              </div>
            </details>
          </Card>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={primaryButton} disabled={pending} onClick={save}>
              {pending ? "Working…" : "Save"}
            </button>
            <button type="button" className={ghostButton} disabled={pending || !draft.channelId} onClick={sendTest}>
              Send test
            </button>
            <span className="text-xs text-muted">The test posts a real message in the welcome channel as if you had just joined. It uses what&apos;s on screen, saved or not.</span>
          </div>
          {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
        </div>

        <Card title="Variables" hint="Use these anywhere in the text boxes. They match Dyno's, so a message can be copied across as it is.">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {WELCOME_VARIABLES.map((v) => (
              <div key={v.token} className="flex gap-2">
                <dt className="shrink-0 font-mono text-gold">{v.token}</dt>
                <dd className="text-muted">{v.meaning}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted">
            In a title, author or footer a mention shows as a name, because Discord can&apos;t draw mentions there. You can also paste a mention as Discord writes it, such as &lt;#123456&gt; for a channel.
          </p>
        </Card>
      </div>

      <div className="min-w-0">
        <div className="xl:sticky xl:top-4">
          <Card title="Preview" hint="Roughly how it will look in Discord, for an example member called PvmRyan.">
            <Preview draft={draft} sample={sample} hasText={hasText} hasEmbed={hasEmbed} />
            {draft.alsoDm && <p className="text-xs text-muted">A copy is also sent to the member by DM, without the button.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------- preview ----------

const isWebAddress = (url: string) => /^https?:\/\//i.test(url);

function Preview({ draft, sample, hasText, hasEmbed }: { draft: WelcomeDraft; sample: PreviewSample; hasText: boolean; hasEmbed: boolean }) {
  const content = fillPreview(draft.content, sample);
  const plain = (t: string) => fillPreview(t, sample, true).text.trim();
  const title = plain(draft.title);
  const titleUrl = plain(draft.titleUrl);
  const author = plain(draft.authorName);
  const authorIcon = plain(draft.authorIconUrl);
  const thumbnail = plain(draft.thumbnailUrl);
  const image = plain(draft.imageUrl);
  const footer = plain(draft.footerText);
  const footerIcon = plain(draft.footerIconUrl);
  const description = fillPreview(draft.description, sample);
  const fields = draft.fields.filter((f) => f.name.trim() && f.value.trim());

  const embedHasContent = !!(title || description.text.trim() || author || thumbnail || image || footer || fields.length > 0);
  const showText = hasText && content.text.trim() !== "";
  const showEmbed = hasEmbed && embedHasContent;

  return (
    <div className="rounded-md bg-[#313338] p-4 text-[#dbdee1]">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5865f2] font-bold text-white" aria-hidden="true">
          J
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-semibold text-white">JonnyBot</span>
            <span className="ml-1.5 rounded bg-[#5865f2] px-1 py-px text-[10px] font-semibold text-white">APP</span>
            <span className="ml-2 text-xs text-[#949ba4]">Today at 09:16</span>
          </p>

          {showText && <DiscordText text={content.text} mentions={content.mentions} className="text-[#dbdee1]" />}

          {showEmbed && (
            <div className="mt-1 max-w-[26rem] overflow-hidden rounded border-l-4 bg-[#2b2d31] p-3" style={{ borderLeftColor: draft.color === null ? "#1e1f22" : colorToHex(draft.color) }}>
              <div className="flex gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  {author && (
                    <p className="flex items-center gap-2 text-xs font-semibold text-white">
                      {isWebAddress(authorIcon) && (
                        // eslint-disable-next-line @next/next/no-img-element -- a preview of an address the admin typed; it can be any host
                        <img src={authorIcon} alt="" className="h-5 w-5 rounded-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                      )}
                      <span className="break-words">{author}</span>
                    </p>
                  )}
                  {title && (
                    <p className="break-words text-sm font-semibold text-white">
                      {isWebAddress(titleUrl) ? <span className="text-[#00a8fc]">{title}</span> : title}
                    </p>
                  )}
                  {description.text.trim() && <DiscordText text={description.text} mentions={description.mentions} className="text-[#dbdee1]" />}
                  {fields.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                      {fields.map((f, i) => {
                        const value = fillPreview(f.value, sample);
                        return (
                          <div key={i} className={f.inline ? "min-w-[7rem] flex-1 basis-[30%]" : "basis-full"}>
                            <p className="text-xs font-semibold text-white">{plain(f.name)}</p>
                            <DiscordText text={value.text} mentions={value.mentions} className="text-[#dbdee1]" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {isWebAddress(thumbnail) && (
                  // eslint-disable-next-line @next/next/no-img-element -- a preview of an address the admin typed; it can be any host
                  <img src={thumbnail} alt="" className="h-16 w-16 shrink-0 rounded object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                )}
              </div>
              {isWebAddress(image) && (
                // eslint-disable-next-line @next/next/no-img-element -- a preview of an address the admin typed; it can be any host
                <img src={image} alt="" className="mt-3 max-h-72 w-full rounded object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
              {footer && (
                <p className="mt-2 flex items-center gap-2 text-[11px] text-[#949ba4]">
                  {isWebAddress(footerIcon) && (
                    // eslint-disable-next-line @next/next/no-img-element -- a preview of an address the admin typed; it can be any host
                    <img src={footerIcon} alt="" className="h-4 w-4 rounded-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  )}
                  <span className="break-words">{footer}</span>
                </p>
              )}
            </div>
          )}

          {!showText && !showEmbed && <p className="text-sm text-[#949ba4]">Nothing to show yet. Add some text or an embed.</p>}

          {draft.linkButton && (showText || showEmbed) && (
            <p className="mt-2">
              <span className="inline-block rounded bg-[#5865f2] px-4 py-1.5 text-sm font-medium text-white">{draft.linkButtonLabel.trim() || "Link your RuneScape name"}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
