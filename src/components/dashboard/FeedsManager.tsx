"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import {
  dangerButton,
  FormField,
  inputClass,
  Notice,
  primaryButton,
  StatusBadge,
} from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import {
  choicesOf,
  type FeedInput,
  type FeedItem,
  type FeedList,
  type GuildStructure,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

type Result = Promise<WelcomeActionResult<FeedList>>;

export interface FeedsActions {
  save: (feed: FeedInput) => Result;
  remove: (id: string) => Result;
}

type Problem = { title: string; items: string[] } | null;
type Kind = FeedItem["kind"];

const KINDS: { key: Kind; label: string }[] = [
  { key: "YOUTUBE", label: "YouTube channel" },
  { key: "REDDIT", label: "Subreddit" },
];

/** What a followed feed is called in a list: the subreddit as r/name, a YouTube channel by its ID. */
function sourceLabel(feed: Pick<FeedItem, "kind" | "source">): string {
  return feed.kind === "REDDIT" ? `r/${feed.source}` : feed.source;
}

/**
 * The YouTube channels and subreddits a server follows, posted to a channel as new things appear. Basic is what to follow, where to post it and (Reddit) a flair; Advanced
 * adds the message. A message that has been saved stays visible while you change the feed. Nothing is followed until a feed is added here, and a new feed starts from now:
 * it never posts what was already there.
 */
export function FeedsManager({
  initial,
  structure,
  actions,
}: {
  initial: FeedList;
  structure: GuildStructure;
  actions: FeedsActions;
}) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(initial.feeds.length === 0);
  const [kind, setKind] = useState<Kind>("YOUTUBE");
  const [source, setSource] = useState("");
  const [flair, setFlair] = useState("");
  const [channelId, setChannelId] = useState<string | null>(null);
  const [template, setTemplate] = useState("");
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const saved = list.feeds.find((f) => f.id === editing);
  const showTemplate = advanced || !!saved?.template;
  const draftHasTemplate = template.trim() !== "" && !showTemplate;

  function run(work: () => Result, done: string, after?: () => void) {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await work();
      if (!result.ok)
        return setProblem({ title: result.error, items: result.problems });
      setList(result.data);
      setNote(done);
      after?.();
    });
  }

  function reset() {
    setEditing(null);
    setKind("YOUTUBE");
    setSource("");
    setFlair("");
    setChannelId(null);
    setTemplate("");
  }

  function edit(feed: FeedItem) {
    setEditing(feed.id);
    setKind(feed.kind);
    setSource(feed.source);
    setFlair(feed.flair);
    setChannelId(feed.channelId);
    setTemplate(feed.template);
    setNote(null);
    setProblem(null);
    setOpen(true);
  }

  function save(feed: FeedInput, done: string, after?: () => void) {
    run(() => actions.save(feed), done, after);
  }

  const form: FeedInput = {
    id: editing ?? undefined,
    kind,
    source,
    flair: kind === "REDDIT" ? flair : "",
    channelId: channelId ?? "",
    template,
    enabled: saved?.enabled ?? true,
  };

  return (
    <div className="space-y-4">
      <CollapsibleCard
        id="feed-form"
        title={editing ? "Change a feed" : "Follow a feed"}
        hint="Pick what to follow and where new posts go."
        open={open}
        onOpenChange={setOpen}
        summary={
          <Chip>
            {list.feeds.length} {list.feeds.length === 1 ? "feed" : "feeds"}
          </Chip>
        }
        info="Checked every ten minutes. A feed starts from now: it never posts what was already there, and posts at most three new items per check. JonnyBot needs View Channel and Send Messages in the channel."
      >
        <FormField label="Follow" size="md" as="group">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                aria-pressed={kind === k.key}
                disabled={!!editing}
                onClick={() => setKind(k.key)}
                className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-60 ${kind === k.key ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </FormField>
        <FormField
          label={kind === "YOUTUBE" ? "Channel ID or link" : "Subreddit"}
          size="md"
          hint={
            kind === "YOUTUBE"
              ? "The 24-character ID starting UC, or a youtube.com/channel/UC… link. Find it on the channel's page under About › Share channel › Copy channel ID."
              : "For example runescape or r/runescape."
          }
        >
          <input
            className={inputClass}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={kind === "YOUTUBE" ? "UCxxxxxxxxxxxxxxxxxxxxxx" : "runescape"}
          />
        </FormField>
        {kind === "REDDIT" && (
          <FormField
            label="Only this flair (optional)"
            size="md"
            hint="Leave empty for every post. NSFW and pinned posts are never posted."
          >
            <input
              className={inputClass}
              value={flair}
              maxLength={list.maxFlair}
              onChange={(e) => setFlair(e.target.value)}
              placeholder="News"
            />
          </FormField>
        )}
        <FormField label="Post in" size="md" as="group">
          <ChannelSelect
            {...choicesOf(structure)}
            onlyPostable
            allowForums={false}
            value={channelId}
            onChange={setChannelId}
            none="Choose a channel…"
          />
        </FormField>
        {showTemplate && (
          <FormField
            label="Message"
            size="lg"
            hint={
              <>
                Placeholders: {"{title}"}, {"{url}"}, {"{author}"}
                {kind === "REDDIT" && ", {source}"}. Empty uses the standard message.
              </>
            }
          >
            <textarea
              className={inputClass}
              rows={3}
              maxLength={list.maxTemplate}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder={list.defaultTemplates[kind]}
            />
          </FormField>
        )}
        {!showTemplate && (
          <MoreInAdvanced>
            {draftHasTemplate ? "Also in use: the message." : "your own message."}
          </MoreInAdvanced>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButton}
            disabled={pending || !channelId || !source.trim()}
            onClick={() =>
              save(form, editing ? "Saved." : "Following. New posts appear from now on.", () => {
                reset();
                setOpen(false);
              })
            }
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Follow"}
          </button>
          {editing && (
            <button
              type="button"
              className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Cancel
            </button>
          )}
        </div>
        {(!channelId || !source.trim()) && (
          <p className="text-xs text-muted">
            Fill in {kind === "YOUTUBE" ? "the channel" : "the subreddit"} and a channel to post in to follow it.
          </p>
        )}
      </CollapsibleCard>

      {problem && (
        <Notice tone="error" title={problem.title} items={problem.items} />
      )}
      {note && <Notice tone="success" title={note} />}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">
          Followed feeds
        </h2>
        {list.feeds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">
            Nothing is followed yet. Add a YouTube channel or a subreddit above and new posts will appear in the channel you pick.
          </p>
        ) : (
          <PanelGrid min="22rem" gap="gap-3">
            {list.feeds.map((f) => (
              <div
                key={f.id}
                className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5"
              >
                <div>
                  <p className="font-semibold break-all">{sourceLabel(f)}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {f.kind === "YOUTUBE" ? "YouTube" : "Reddit"} → #
                    {f.channelName ?? "deleted channel"}
                    {f.flair && ` · flair “${f.flair}”`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    tone={f.problem ? "warn" : f.enabled ? "good" : "muted"}
                  >
                    {f.problem ? "Not working" : f.enabled ? "Active" : "Paused"}
                  </StatusBadge>
                  {f.template && <StatusBadge tone="muted">Own message</StatusBadge>}
                </div>
                {f.problem && (
                  <p className="text-sm text-amber-300">{f.problem}</p>
                )}
                <Toggle
                  checked={f.enabled}
                  disabled={pending}
                  label="Post new items"
                  onChange={(next) =>
                    save(
                      {
                        id: f.id,
                        kind: f.kind,
                        source: f.source,
                        flair: f.flair,
                        channelId: f.channelId,
                        template: f.template,
                        enabled: next,
                      },
                      next ? "Resumed." : "Paused.",
                    )
                  }
                />
                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold"
                    onClick={() => edit(f)}
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    className={dangerButton}
                    disabled={pending}
                    onClick={() =>
                      run(() => actions.remove(f.id), "Stopped following.", () => {
                        if (editing === f.id) reset();
                      })
                    }
                  >
                    Stop following
                  </button>
                </div>
              </div>
            ))}
          </PanelGrid>
        )}
      </section>
    </div>
  );
}
