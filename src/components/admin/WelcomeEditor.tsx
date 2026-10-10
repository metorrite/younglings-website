"use client";

import { useState, useTransition } from "react";
import { DiscordText } from "@/components/site/DiscordText";
import { BUTTON_MARKER, containerBlocks } from "@/lib/containerPreview";
import { hasBold, toBold, toPlain } from "@/lib/unicodeStyle";
import { ImageUrlField } from "./ImageUrlField";
import type { FooterStyle, ForumInfo, ForumThread, GuildStructure, LinkButtonStyle, WelcomeActionResult, WelcomeConfig, WelcomeDraft, WelcomeField, WelcomeMessageType } from "@/lib/jonnybot-admin";
import { colorToHex, fillPreview, hexToColor, WELCOME_VARIABLES, type PreviewSample } from "@/lib/welcomePreview";
import { ChannelSelect } from "./pickers";
import { Card, FormField, ghostButton, inputClass, Notice, primaryButton } from "./ui";

// Discord's limits, as the bot enforces them (WelcomeValidator), so the counters turn red before a save would be refused.
const MAX = { content: 1800, title: 256, description: 3900, author: 256, footer: 2048, fieldName: 256, fieldValue: 1024, fields: 25 };

const TYPES: { id: WelcomeMessageType; label: string; hint: string }[] = [
  { id: "MESSAGE", label: "Message", hint: "Just a line of text." },
  { id: "EMBED", label: "Embed", hint: "The classic boxed message. A button can only sit underneath it." },
  { id: "EMBED_TEXT", label: "Embed and text", hint: "A line of text above the classic embed." },
  { id: "CONTAINER", label: "Container", hint: "The newer look: the button can sit inside, the footer can be bright, links work in every part." },
];

const FOOTER_LOOKS: { id: FooterStyle; label: string; hint: string }[] = [
  { id: "small", label: "Small grey", hint: "Like an embed's footer." },
  { id: "normal", label: "Normal", hint: "As bright as the rest of the text." },
  { id: "bold", label: "Bold", hint: "Bold and bright, like Dyno's." },
];

const BUTTON_COLOURS: { id: LinkButtonStyle; label: string; bg: string }[] = [
  { id: "primary", label: "Blue", bg: "#5865f2" },
  { id: "secondary", label: "Grey", bg: "#4e5058" },
  { id: "success", label: "Green", bg: "#248046" },
  { id: "danger", label: "Red", bg: "#da373c" },
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

/** Bold for the plain-text places (footer, author): swaps the letters for bold ones, and back. See lib/unicodeStyle. */
function BoldToggle({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const bold = hasBold(value);
  return (
    <div className="mt-2 flex gap-2">
      <button type="button" className={ghostButton} disabled={!value || bold} onClick={() => onChange(toBold(value))}>
        <strong>Bold</strong>
      </button>
      <button type="button" className={ghostButton} disabled={!bold} onClick={() => onChange(toPlain(value))}>
        Plain
      </button>
    </div>
  );
}

/** Adds a `[text](address)` link to the end of a text. Discord shows those as clickable words wherever it formats text. */
function LinkInserter({ onInsert }: { onInsert: (markdown: string) => void }) {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const ready = text.trim() !== "" && /^https?:\/\//i.test(url.trim());
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-xs text-muted">Add a link</summary>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input aria-label="Link text" className={`${inputClass} max-w-48`} placeholder="Link text" value={text} onChange={(e) => setText(e.target.value)} />
        <input aria-label="Link address" className={`${inputClass} max-w-64`} placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button
          type="button"
          className={ghostButton}
          disabled={!ready}
          onClick={() => {
            onInsert(`[${text.trim()}](${url.trim()})`);
            setText("");
            setUrl("");
          }}
        >
          Add
        </button>
      </div>
    </details>
  );
}

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

/** The two things the editor does on the server. The page passes the Server Actions for whichever server it manages, so this one editor serves the clan's admin console and the bot dashboard alike. */
export interface WelcomeActions {
  save: (draft: WelcomeDraft) => Promise<WelcomeActionResult<WelcomeConfig>>;
  test: (draft: WelcomeDraft) => Promise<WelcomeActionResult<{ sent: boolean; channelName: string; dmSent: boolean }>>;
  /** Where pictures for the embed's places are posted (`{url}/{slot}`; a new one replaces the old), and the action that deletes one. Without both the picture fields are just addresses. */
  imageUploadUrl?: string;
  removeImage?: (slot: string) => Promise<WelcomeActionResult<{ removed: boolean }>>;
}

export function WelcomeEditor({ initial, channels, forums, threads, actions }: { initial: WelcomeConfig; channels: GuildStructure["channels"]; forums?: ForumInfo[]; threads?: ForumThread[]; actions: WelcomeActions }) {
  const [draft, setDraft] = useState<WelcomeDraft>(() => toDraft(initial));
  const [meta, setMeta] = useState({ serverName: initial.serverName, memberCount: initial.memberCount });
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const uploads = actions.imageUploadUrl && actions.removeImage ? { url: actions.imageUploadUrl, remove: actions.removeImage } : undefined;

  // which detail sections start open: the ones that already have something in them
  const [open] = useState(() => ({
    author: !!(initial.authorName || initial.authorIconUrl),
    images: !!(initial.thumbnailUrl || initial.imageUrl),
    footer: !!(initial.footerText || initial.footerIconUrl),
    fields: initial.fields.length > 0,
  }));

  // What the editor did on its own (switching to a container), told to the person so it is never a surprise.
  const [autoNote, setAutoNote] = useState<string | null>(null);

  /**
   * Switches to the Container type for something only a container can do, and says so. A container has no line of text above it, so
   * that line is moved to the top of the description rather than silently dropped.
   */
  function toContainer(reason: string, patch: Partial<WelcomeDraft> = {}) {
    setOutcome(null);
    let next: WelcomeDraft = { ...draft, ...patch, messageType: "CONTAINER" };
    let note = `Switched to Container: ${reason}.`;
    if (draft.messageType === "EMBED_TEXT" && draft.content.trim()) {
      next = { ...next, description: [draft.content.trim(), next.description.trim()].filter(Boolean).join("\n\n"), content: "" };
      note += " A container has no separate line of text above it, so that line was moved to the top of the description.";
    }
    setDraft(next);
    setAutoNote(note);
  }

  /** Whether a classic embed is being asked for something only a container does. */
  const needsContainer = (type: WelcomeMessageType) => type === "EMBED" || type === "EMBED_TEXT";

  function set<K extends keyof WelcomeDraft>(key: K, value: WelcomeDraft[K]) {
    if (needsContainer(draft.messageType) && (key === "description" || key === "footerText") && typeof value === "string" && value.includes(BUTTON_MARKER)) {
      toContainer(`${BUTTON_MARKER} puts the button inside the message`, { [key]: value, linkButton: true });
      return;
    }
    setDraft((d) => ({ ...d, [key]: value }));
    setOutcome(null);
  }

  function setField(index: number, patch: Partial<WelcomeField>) {
    const fields = draft.fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    const changed = fields[index];
    if (needsContainer(draft.messageType)) {
      if (changed.value.includes(BUTTON_MARKER)) return toContainer(`${BUTTON_MARKER} puts the button inside the message`, { fields, linkButton: true });
      if (/\]\(https?:\/\//i.test(changed.name)) return toContainer("a link in a field's name only works in a container", { fields });
    }
    set("fields", fields);
  }

  /** The type picker, by hand. Leaving Container takes {rs_button} out of the text (an embed can't hold the button) and says so. */
  function chooseType(type: WelcomeMessageType) {
    setOutcome(null);
    setAutoNote(null);
    if (type === "CONTAINER" || draft.messageType !== "CONTAINER") {
      setDraft((d) => ({ ...d, messageType: type }));
      return;
    }
    const strip = (t: string) => t.split(BUTTON_MARKER).join("").trim();
    const had = [draft.description, draft.footerText, ...draft.fields.map((f) => f.value)].some((t) => t.includes(BUTTON_MARKER));
    setDraft((d) => ({ ...d, messageType: type, description: strip(d.description), footerText: strip(d.footerText), fields: d.fields.map((f) => ({ ...f, value: strip(f.value) })) }));
    if (had) setAutoNote(`${BUTTON_MARKER} was taken out of the text: an ${type === "MESSAGE" ? "plain message" : "embed"} can't hold the button inside it, so it sits underneath.`);
  }

  /** Puts the button in the footer or after the description, switching to a container if it isn't one yet. */
  function placeButton(where: "footer" | "description") {
    const patch: Partial<WelcomeDraft> =
      where === "footer"
        ? { footerText: `${draft.footerText.replace(BUTTON_MARKER, "").trim()} ${BUTTON_MARKER}`.trim(), linkButton: true }
        : { description: `${draft.description.replace(BUTTON_MARKER, "").trimEnd()}\n${BUTTON_MARKER}`, linkButton: true };
    if (needsContainer(draft.messageType)) toContainer("the button can only sit inside the message in a container", patch);
    else {
      setDraft((d) => ({ ...d, ...patch }));
      setOutcome(null);
    }
  }

  const container = draft.messageType === "CONTAINER";
  const hasText = draft.messageType === "MESSAGE" || draft.messageType === "EMBED_TEXT";
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
      const result = await actions.save(draft);
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
      const result = await actions.test(draft);
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
            <p className="mt-0.5 text-xs text-muted">
              Not sure? Start with Embed and use what you need: the editor switches to Container by itself when you ask for something only a container can do, such as the button inside the message or a brighter footer.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {TYPES.map((t) => (
                <label key={t.id} className={`flex cursor-pointer flex-col rounded-md border px-3 py-2 text-sm ${draft.messageType === t.id ? "border-gold bg-gold/10" : "border-surface-border bg-background/40"}`}>
                  <span className="flex items-center gap-2 font-medium">
                    <input type="radio" name="welcome-type" className="accent-[var(--color-gold)]" checked={draft.messageType === t.id} onChange={() => chooseType(t.id)} />
                    {t.label}
                  </span>
                  <span className="mt-0.5 text-xs text-muted">{t.hint}</span>
                </label>
              ))}
            </div>
            {autoNote && (
              <div role="status" className="mt-3 flex items-start justify-between gap-3 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-xs">
                <span>{autoNote}</span>
                <button type="button" className="shrink-0 text-muted hover:text-foreground" aria-label="Dismiss" onClick={() => setAutoNote(null)}>
                  ✕
                </button>
              </div>
            )}
          </fieldset>

          <FormField label="Welcome channel" hint="Only channels JonnyBot can post in are listed.">
            <ChannelSelect channels={channels} forums={forums} threads={threads} onlyPostable value={draft.channelId} onChange={(id) => set("channelId", id)} none="Choose a channel…" />
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
            <div className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Button label" hint={container ? "Beside a line of text (like the footer) a long label squeezes the text, so keep it short there, such as Link RS name." : undefined}>
                  <input id="welcome-button-label" className={inputClass} value={draft.linkButtonLabel} maxLength={80} onChange={(e) => set("linkButtonLabel", e.target.value)} />
                </FormField>
                <FormField label="Button colour" as="group">
                  <div className="flex flex-wrap gap-2">
                    {BUTTON_COLOURS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={draft.linkButtonStyle === c.id}
                        onClick={() => set("linkButtonStyle", c.id)}
                        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition ${draft.linkButtonStyle === c.id ? "border-gold bg-gold/10" : "border-surface-border text-muted hover:text-foreground"}`}
                      >
                        <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: c.bg }} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                </FormField>
              </div>
              <p className="text-xs text-muted">
                {container ? (
                  <>
                    Write <code className="rounded bg-white/10 px-1 text-gold">{BUTTON_MARKER}</code> in the description, a field&apos;s value or the footer to put the button on that line, with that line&apos;s text beside it.
                    Leave it out and the button goes at the bottom. Put it in the footer in <strong>Grey</strong> for a quiet look.
                  </>
                ) : (
                  <>
                    The button sits underneath the message: Discord can&apos;t put a button inside an embed. To place it inside, use one of these, or write{" "}
                    <code className="rounded bg-white/10 px-1 text-gold">{BUTTON_MARKER}</code> in the description or footer, and the message switches to a Container for you.
                  </>
                )}
              </p>
              {draft.messageType !== "MESSAGE" && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={ghostButton} onClick={() => placeButton("footer")}>
                    Put it in the footer
                  </button>
                  <button type="button" className={ghostButton} onClick={() => placeButton("description")}>
                    Put it after the description
                  </button>
                </div>
              )}
            </div>
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
          <Card
            title={container ? "Container" : "Embed"}
            hint={container ? "Every part is optional. Everything here is text Discord formats, so **bold** and [links](https://example.com) work in every part, and the footer is small grey text. Inline fields and the author and footer icons don't exist in a container." : "Every part is optional."}
          >
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
              <LinkInserter onInsert={(md) => set("description", draft.description ? `${draft.description.trimEnd()} ${md}` : md)} />
            </FormField>

            <details className="rounded-md border border-surface-border bg-background/40 p-3" open={open.author}>
              <summary className="cursor-pointer text-sm font-medium">Author</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <FormField label="Author name" hint={container ? "Shown as small grey text above the title. Markdown works." : "Shown beside the author icon. Like the footer, it can't use **markdown**; use Bold instead."}>
                  <input id="welcome-author" className={inputClass} value={draft.authorName} onChange={(e) => set("authorName", e.target.value)} />
                  {!container && <BoldToggle value={draft.authorName} onChange={(v) => set("authorName", v)} />}
                </FormField>
                {!container && (
                  <FormField label="Author icon" hint="A picture address. Needs an author name.">
                    <ImageUrlField id="welcome-author-icon" slot="author_icon" value={draft.authorIconUrl} onChange={(v) => set("authorIconUrl", v)} uploads={uploads} />
                  </FormField>
                )}
              </div>
            </details>

            <details className="rounded-md border border-surface-border bg-background/40 p-3" open={open.images}>
              <summary className="cursor-pointer text-sm font-medium">Image and thumbnail</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <FormField label="Thumbnail" hint="The small picture top right. {avatar} uses the new member's.">
                  <ImageUrlField id="welcome-thumbnail" slot="thumbnail" value={draft.thumbnailUrl} onChange={(v) => set("thumbnailUrl", v)} uploads={uploads} />
                </FormField>
                <FormField label="Image" hint="The large picture at the bottom.">
                  <ImageUrlField id="welcome-image" slot="image" value={draft.imageUrl} onChange={(v) => set("imageUrl", v)} uploads={uploads} />
                </FormField>
              </div>
            </details>

            <details className="rounded-md border border-surface-border bg-background/40 p-3" open={open.footer}>
              <summary className="cursor-pointer text-sm font-medium">Footer</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <FormField label="Footer text" hint={container ? "Shown as small grey text at the bottom. Markdown works, so **bold** and [links](https://example.com) do." : "Discord doesn't format footer text, so **stars** would show as stars. Use Bold to make it stand out."}>
                  <input id="welcome-footer" className={inputClass} value={draft.footerText} onChange={(e) => set("footerText", e.target.value)} />
                  {container ? <LinkInserter onInsert={(md) => set("footerText", draft.footerText ? `${draft.footerText} ${md}` : md)} /> : <BoldToggle value={draft.footerText} onChange={(v) => set("footerText", v)} />}
                </FormField>
                {
                  <FormField
                    label="Footer look"
                    as="group"
                    hint={
                      container
                        ? "In a container the footer is ordinary text, so it can be as bright as the rest or bold."
                        : "A classic embed's footer is always small and grey: Discord fixes that. Choosing Normal or Bold switches this message to a Container, where the footer is ordinary text."
                    }
                  >
                    <div className="flex flex-wrap gap-2">
                      {FOOTER_LOOKS.map((look) => (
                        <button
                          key={look.id}
                          type="button"
                          aria-pressed={draft.footerStyle === look.id}
                          title={look.hint}
                          onClick={() => (look.id !== "small" && needsContainer(draft.messageType) ? toContainer("a normal or bold footer only works in a container", { footerStyle: look.id }) : set("footerStyle", look.id))}
                          className={`rounded-md border px-3 py-1.5 text-sm transition ${draft.footerStyle === look.id ? "border-gold bg-gold/10" : "border-surface-border text-muted hover:text-foreground"}`}
                        >
                          {look.label}
                        </button>
                      ))}
                    </div>
                  </FormField>
                }
                {!container && (
                  <FormField label="Footer icon" hint="Needs footer text.">
                    <ImageUrlField id="welcome-footer-icon" slot="footer_icon" value={draft.footerIconUrl} onChange={(v) => set("footerIconUrl", v)} uploads={uploads} />
                  </FormField>
                )}
              </div>
            </details>

            <details className="rounded-md border border-surface-border bg-background/40 p-3" open={open.fields}>
              <summary className="cursor-pointer text-sm font-medium">Fields ({draft.fields.length})</summary>
              <div className="mt-3 space-y-3">
                {draft.fields.map((field, i) => (
                  <div key={i} className="space-y-2 rounded-md border border-surface-border p-3">
                    <div className={container ? "" : "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"}>
                      <input
                        aria-label={`Field ${i + 1} name`}
                        className={inputClass}
                        placeholder={container ? "Field name (a link works: [Website](https://example.com))" : "Field name (a link here switches to a Container)"}
                        value={field.name}
                        onChange={(e) => setField(i, { name: e.target.value })}
                      />
                      {!container && (
                        <label className="flex items-center gap-2 text-sm" title="Inline fields sit side by side, up to three to a row, instead of one under another.">
                          <input type="checkbox" className="accent-[var(--color-gold)]" checked={field.inline} onChange={(e) => setField(i, { inline: e.target.checked })} />
                          Inline
                        </label>
                      )}
                    </div>
                    <textarea aria-label={`Field ${i + 1} value`} className={`${inputClass} min-h-16`} rows={2} placeholder={container ? "Field value (optional: a name alone is a single line)" : "Field value"} value={field.value} onChange={(e) => setField(i, { value: e.target.value })} />
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
            <button
              type="button"
              className={ghostButton}
              disabled={pending || !draft.channelId}
              title={draft.channelId ? undefined : "Choose a welcome channel first"}
              onClick={sendTest}
            >
              Send test
            </button>
            <span className="text-xs text-muted">
              {draft.channelId
                ? "The test posts a real message in the welcome channel as if you had just joined. It uses what's on screen, saved or not, and works while the welcome is switched off."
                : "Choose a welcome channel above to send a test. The welcome itself can stay switched off: a test works either way."}
            </span>
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
            <Preview draft={draft} sample={sample} hasText={hasText} hasEmbed={hasEmbed} container={container} />
            {draft.alsoDm && <p className="text-xs text-muted">A copy is also sent to the member by DM, without the button.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------- preview ----------

const isWebAddress = (url: string) => /^https?:\/\//i.test(url);

function Preview({ draft, sample, hasText, hasEmbed, container }: { draft: WelcomeDraft; sample: PreviewSample; hasText: boolean; hasEmbed: boolean; container: boolean }) {
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
  const showEmbed = hasEmbed && embedHasContent && !container;
  const showContainer = container && embedHasContent;

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

          {showContainer && <ContainerPreview draft={draft} sample={sample} plain={plain} />}

          {!showText && !showEmbed && !showContainer && <p className="text-sm text-[#949ba4]">Nothing to show yet. Add some text or an embed.</p>}

          {draft.linkButton && (showText || showEmbed) && (
            <p className="mt-2">
              <LinkButton draft={draft} />
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** The link button as Discord draws it, in the colour chosen. */
function LinkButton({ draft }: { draft: WelcomeDraft }) {
  const colour = BUTTON_COLOURS.find((c) => c.id === draft.linkButtonStyle) ?? BUTTON_COLOURS[0];
  return (
    <span className="inline-block rounded px-4 py-1.5 text-sm font-medium text-white" style={{ backgroundColor: colour.bg }}>
      {draft.linkButtonLabel.trim() || "Link your RuneScape name"}
    </span>
  );
}

/** A Container welcome: the same blocks the bot builds, with the button where {rs_button} puts it. */
function ContainerPreview({ draft, sample, plain }: { draft: WelcomeDraft; sample: PreviewSample; plain: (t: string) => string }) {
  const blocks = containerBlocks(draft, plain, isWebAddress);
  const text = (t: string) => {
    const filled = fillPreview(t, sample);
    return <DiscordText text={filled.text} mentions={filled.mentions} className="text-[#dbdee1]" />;
  };

  return (
    <div className="mt-1 max-w-[26rem] space-y-2 overflow-hidden rounded border-l-4 bg-[#2b2d31] p-3" style={{ borderLeftColor: draft.color === null ? "#1e1f22" : colorToHex(draft.color) }}>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "text":
            return <div key={i}>{text(b.text)}</div>;
          case "thumb":
            return (
              <div key={i} className="flex gap-3">
                <div className="min-w-0 flex-1">{text(b.text)}</div>
                {/* eslint-disable-next-line @next/next/no-img-element -- a preview of an address the admin typed; it can be any host */}
                <img src={b.thumbnail} alt="" className="h-16 w-16 shrink-0 rounded object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
              </div>
            );
          case "button":
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">{text(b.text)}</div>
                <LinkButton draft={draft} />
              </div>
            );
          case "gallery":
            // eslint-disable-next-line @next/next/no-img-element -- a preview of an address the admin typed; it can be any host
            return <img key={i} src={b.url} alt="" className="max-h-72 w-full rounded object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />;
          case "gap":
            return <div key={i} className="h-1" />;
          case "row":
            return (
              <div key={i}>
                <LinkButton draft={draft} />
              </div>
            );
        }
      })}
    </div>
  );
}
