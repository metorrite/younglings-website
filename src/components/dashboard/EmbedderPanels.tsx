"use client";

import { useState, useTransition } from "react";
import { MessageEditor } from "@/components/admin/MessageEditor";
import { ChannelSelect } from "@/components/admin/pickers";
import { dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import type { ChannelChoices, EmbedderMessage, WelcomeActionResult, WelcomeDraft } from "@/lib/jonnybot-admin";
import { fillBanned } from "@/lib/banPreview";
import { WELCOME_VARIABLES, type PreviewSample } from "@/lib/welcomePreview";
import { EMPTY_MESSAGE } from "@/lib/messageDraft";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

export interface EmbedderActions {
  save: (input: { id?: string; name: string; message: WelcomeDraft; apply?: boolean }) => Promise<WelcomeActionResult<EmbedderMessage>>;
  post: (id: string, channelId: string) => Promise<WelcomeActionResult<EmbedderMessage>>;
  clone: (id: string, channelId: string) => Promise<WelcomeActionResult<EmbedderMessage>>;
  remove: (id: string) => Promise<WelcomeActionResult<{ deleted: boolean }>>;
}

/** What the bot fills in, like the goodbye message: the poster's name stands in for {user}, and nothing is a mention. */
const VARIABLES = WELCOME_VARIABLES.filter((v) => ["{user}", "{username}", "{avatar}", "{server}", "{channel}", "{count}"].includes(v.token));

const NEW_DRAFT: WelcomeDraft = { ...EMPTY_MESSAGE, enabled: false, channelId: null, alsoDm: false, messageType: "EMBED_TEXT" };

/** The stored message as the editor's draft: the channel and the on/off switch are the welcome's, so they are cleared. */
function toDraft(m: EmbedderMessage): WelcomeDraft {
  const { channelName, ...rest } = m.message;
  void channelName;
  return { ...rest, enabled: false, channelId: null, alsoDm: false, linkButton: false };
}

const shape = (name: string, d: WelcomeDraft) => JSON.stringify([name, d]);

export function EmbedderPanels({ initial, limit, actions, ...choices }: { initial: EmbedderMessage[]; limit: number; actions: EmbedderActions } & ChannelChoices) {
  const [messages, setMessages] = useState(initial);
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const current = selected && selected !== "new" ? messages.find((m) => m.id === selected) ?? null : null;
  const upsert = (m: EmbedderMessage) => setMessages((all) => (all.some((x) => x.id === m.id) ? all.map((x) => (x.id === m.id ? m : x)) : [m, ...all]));

  return (
    <div className="space-y-6">
      <section aria-labelledby="embedder-list" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-1">
          <h2 id="embedder-list" className="text-lg font-semibold text-gold">
            Your messages
          </h2>
          <button type="button" className={primaryButton} disabled={messages.length >= limit} onClick={() => { setSelected("new"); setOutcome(null); }}>
            New message
          </button>
        </div>
        {messages.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet. Write a message, save it as a draft, and post it when it is ready.</p>
        ) : (
          <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface">
            {messages.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 basis-48 truncate font-medium">{m.name}</span>
                <Chip tone={m.status === "POSTED" ? "good" : "plain"}>{m.status === "POSTED" ? `Posted in #${m.channelName ?? "a channel"}` : "Draft"}</Chip>
                {m.messageUrl && (
                  <a className="text-xs text-gold hover:underline" href={m.messageUrl} target="_blank" rel="noreferrer">
                    Open in Discord
                  </a>
                )}
                <button type="button" className={ghostButton} onClick={() => { setSelected(m.id); setOutcome(null); }}>
                  {selected === m.id ? "Editing" : "Open"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {messages.length >= limit && <p className="text-xs text-amber-300">This server has reached the limit of {limit} saved messages. Delete some to add more.</p>}
        {outcome && selected === null && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
      </section>

      {selected !== null && (
        <Editor
          key={selected}
          message={current}
          actions={actions}
          choices={choices}
          onSaved={(m, note) => { upsert(m); setSelected(m.id); setOutcome({ tone: "success", title: note }); }}
          onRemoved={(name) => { setMessages((all) => all.filter((m) => m.id !== selected)); setSelected(null); setOutcome({ tone: "success", title: `Deleted "${name}".` }); }}
          onCloned={(m, channelName) => { upsert(m); setOutcome({ tone: "success", title: `Copied into #${channelName}. The copy is its own message, listed above.` }); }}
        />
      )}
    </div>
  );
}

function Editor({
  message,
  actions,
  choices,
  onSaved,
  onRemoved,
  onCloned,
}: {
  message: EmbedderMessage | null;
  actions: EmbedderActions;
  choices: ChannelChoices;
  onSaved: (m: EmbedderMessage, note: string) => void;
  onRemoved: (name: string) => void;
  onCloned: (m: EmbedderMessage, channelName: string) => void;
}) {
  const [name, setName] = useState(message?.name ?? "");
  const [draft, setDraft] = useState<WelcomeDraft>(() => (message ? toDraft(message) : NEW_DRAFT));
  const [saved, setSaved] = useState<{ name: string; draft: WelcomeDraft }>(() => ({ name: message?.name ?? "", draft: message ? toDraft(message) : NEW_DRAFT }));
  const [targetId, setTargetId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();

  const posted = message?.status === "POSTED";
  const dirty = shape(name, draft) !== shape(saved.name, saved.draft);
  const targetName = choices.channels.find((c) => c.id === targetId)?.name ?? "channel";
  const sample: PreviewSample = { username: "You", server: "Your server", channel: (posted ? message?.channelName : targetName) ?? "channel", count: 100, avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png" };

  const edit = (next: WelcomeDraft) => {
    setDraft({ ...next, enabled: false, channelId: null, alsoDm: false, linkButton: false });
    setOutcome(null);
  };

  const fail = (r: { error: string; problems: string[] }) => setOutcome({ tone: "error", title: r.error, items: r.problems });

  function save(apply: boolean) {
    setOutcome(null);
    start(async () => {
      const r = await actions.save({ id: message?.id, name, message: draft, apply });
      if (!r.ok) return fail(r);
      setSaved({ name: r.data.name, draft: toDraft(r.data) });
      onSaved(r.data, apply ? "Saved, and the message in Discord now shows these changes." : posted ? "Saved here. The message in Discord is unchanged until you update it." : "Draft saved.");
    });
  }

  function post() {
    if (!message || !targetId) return;
    setOutcome(null);
    start(async () => {
      const r = await actions.post(message.id, targetId);
      if (!r.ok) return fail(r);
      onSaved(r.data, `Posted in #${r.data.channelName ?? targetName}.`);
    });
  }

  function clone() {
    if (!message || !targetId) return;
    setOutcome(null);
    start(async () => {
      const r = await actions.clone(message.id, targetId);
      if (!r.ok) return fail(r);
      onCloned(r.data, r.data.channelName ?? targetName);
      setOutcome({ tone: "success", title: `Copied into #${r.data.channelName ?? targetName}.` });
    });
  }

  function remove() {
    if (!message) return;
    setOutcome(null);
    start(async () => {
      const r = await actions.remove(message.id);
      if (!r.ok) { setConfirmDelete(false); return fail(r); }
      onRemoved(message.name);
    });
  }

  return (
    <section aria-labelledby="embedder-edit" className="space-y-3">
      <h2 id="embedder-edit" className="border-b border-surface-border pb-1 text-lg font-semibold text-gold">
        {message ? message.name : "New message"}
      </h2>
      <MessageEditor
        draft={draft}
        saved={saved.draft}
        onChange={edit}
        idPrefix="embedder"
        variables={VARIABLES}
        sample={sample}
        fill={fillBanned}
        messageHint="What is posted. Nobody is ever pinged by it."
        previewHint="Roughly how it will look."
        variablesHint="Filled in when the message is sent. {user} shows your name in bold, because this message isn't about one person."
        before={
          <CollapsibleCard
            id="embedder-where"
            title="Name and place"
            hint="The name is only for you."
            defaultOpen
            summary={
              <>
                <Chip tone={posted ? "good" : "plain"}>{posted ? "Posted" : "Draft"}</Chip>
                {dirty && <Chip tone="warn">Unsaved changes</Chip>}
              </>
            }
            info="A draft is kept here until you post it. Once posted, you can change the message in place (the same Discord message is edited), delete it, or copy it into another channel as a new message. A Container message can't be changed into another kind once it is posted: copy it instead."
          >
            <FormField label="Name" size="md" hint="Up to 80 characters.">
              <input className={inputClass} maxLength={80} value={name} onChange={(e) => { setName(e.target.value); setOutcome(null); }} />
            </FormField>
            {posted && (
              <p className="text-xs text-muted">
                Posted in #{message?.channelName ?? "a channel"}.{" "}
                {message?.messageUrl && (
                  <a className="text-gold hover:underline" href={message.messageUrl} target="_blank" rel="noreferrer">
                    Open in Discord
                  </a>
                )}
              </p>
            )}
          </CollapsibleCard>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={primaryButton} disabled={pending || name.trim() === "" || !dirty} onClick={() => save(false)}>
              {pending ? "Working…" : message ? "Save" : "Save draft"}
            </button>
            {posted && (
              <button type="button" className={primaryButton} disabled={pending || name.trim() === ""} title="Saves, then changes the message in Discord to match" onClick={() => save(true)}>
                Save and update in Discord
              </button>
            )}
          </div>

          {message && (
            <div className="space-y-2 rounded-lg border border-surface-border p-3">
              <FormField label={posted ? "Copy into another channel" : "Post in"} size="md" as="group" hint={posted ? "Posts a copy there as a new message. One channel at a time." : "Only channels JonnyBot can post in are listed. Unsaved changes are not posted: save first."}>
                <ChannelSelect {...choices} onlyPostable allowForums={false} value={targetId} onChange={setTargetId} none="Choose a channel…" />
              </FormField>
              <div className="flex flex-wrap items-center gap-3">
                {posted ? (
                  <button type="button" className={ghostButton} disabled={pending || !targetId || dirty} title={dirty ? "Save your changes first" : undefined} onClick={clone}>
                    Copy here
                  </button>
                ) : (
                  <button type="button" className={primaryButton} disabled={pending || !targetId || dirty} title={dirty ? "Save your changes first" : undefined} onClick={post}>
                    Post message
                  </button>
                )}
                {dirty && <span className="text-xs text-muted">Save first so what is posted is what you see.</span>}
              </div>
            </div>
          )}

          {message && (
            <div className="flex flex-wrap items-center gap-3">
              {confirmDelete ? (
                <>
                  <span className="text-sm text-red-300">{posted ? "Delete this from the list and remove the message from Discord?" : "Delete this draft?"}</span>
                  <button type="button" className={dangerButton} disabled={pending} onClick={remove}>
                    Yes, delete
                  </button>
                  <button type="button" className={ghostButton} disabled={pending} onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </button>
                </>
              ) : (
                <button type="button" className={dangerButton} disabled={pending} onClick={() => setConfirmDelete(true)}>
                  {posted ? "Delete message" : "Delete draft"}
                </button>
              )}
            </div>
          )}
          {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
        </div>
      </MessageEditor>
    </section>
  );
}
