"use client";

import { confirmDialog } from "@/components/ui/Dialogs";
import { useState, useTransition } from "react";
import { cancelScheduledAction, schedulePostAction } from "@/app/admin/(console)/actions";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import type { ForumInfo, ForumThread, GuildStructure, ScheduledPost } from "@/lib/jonnybot-admin";
import { ChannelSelect } from "./pickers";
import { dangerButton, FormField, inputClass, Notice, primaryButton } from "./ui";

const STATUS: Record<ScheduledPost["status"], { label: string; tone: string }> = {
  PENDING: { label: "Waiting", tone: "text-gold" },
  SENT: { label: "Sent", tone: "text-emerald-400" },
  FAILED: { label: "Failed", tone: "text-red-400" },
  CANCELLED: { label: "Cancelled", tone: "text-muted" },
};

/**
 * Write an announcement now and have it posted later. The form comes first and the posts waiting sit beside it; the ones that already went out are folded (open when
 * one failed). Tidying plain text into headings and lists is Advanced, and stays visible once it is ticked.
 */
export function ScheduledPosts({ initial, channels, forums, threads, actions }: { initial: ScheduledPost[]; channels: GuildStructure["channels"]; forums?: ForumInfo[]; threads?: ForumThread[]; actions?: { schedule: typeof schedulePostAction; cancel: typeof cancelScheduledAction } }) {
  const schedulePost = actions?.schedule ?? schedulePostAction;
  const cancelPost = actions?.cancel ?? cancelScheduledAction;
  const [posts, setPosts] = useState(initial);
  const [text, setText] = useState("");
  const [channelId, setChannelId] = useState("");
  const [when, setWhen] = useState("");
  const [convert, setConvert] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const showConvert = mode === "advanced" || convert;

  const pendingPosts = posts.filter((p) => p.status === "PENDING");
  const finished = posts.filter((p) => p.status !== "PENDING");
  const failed = finished.filter((p) => p.status === "FAILED").length;

  function schedule() {
    setError(null);
    setMessage(null);
    start(async () => {
      const result = await schedulePost({ text, channelId, convert, sendAt: when });
      if (!result.ok) return setError(result.error);
      setPosts(result.data);
      setText("");
      setMessage("Scheduled. It will post within about half a minute of the time you chose.");
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="26rem">
        <CollapsibleCard
          id="sched-new"
          title="Schedule a message"
          hint="Uses the same post tags as Post a message. The text is checked now, so mistakes show up before the day it matters."
          defaultOpen
        >
          <FormField label="Message" size="lg">
            <textarea className={`${inputClass} min-h-44 font-mono`} value={text} maxLength={3500} onChange={(e) => setText(e.target.value)} placeholder={"### Weekly Cap Party!\nJoin us at the Citadel on Wednesday."} aria-label="Message text" />
          </FormField>
          <FieldGrid>
            <FormField label="Channel" size="md" as="group">
              <ChannelSelect channels={channels} forums={forums} threads={threads} onlyPostable value={channelId || null} onChange={(id) => setChannelId(id ?? "")} none="Choose a channel…" />
            </FormField>
            <FormField label="Post at (your local time)" size="md">
              <input type="datetime-local" className={inputClass} value={when} onChange={(e) => setWhen(e.target.value)} />
            </FormField>
          </FieldGrid>
          {showConvert && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={convert} onChange={(e) => setConvert(e.target.checked)} /> Tidy plain text into headings and lists first
            </label>
          )}
          <MoreInAdvanced>tidying plain text into headings and lists before it is posted.</MoreInAdvanced>
          <button type="button" className={primaryButton} disabled={pending || !text.trim() || !channelId || !when} onClick={schedule}>
            {pending ? "Working…" : "Schedule it"}
          </button>
          {error && <Notice tone="error" title={error} items={[]} />}
          {message && <Notice tone="success" title={message} items={[]} />}
        </CollapsibleCard>

        <CollapsibleCard
          id="sched-waiting"
          title="Waiting"
          hint="Posts that have not gone out yet."
          defaultOpen
          summary={<Chip tone={pendingPosts.length > 0 ? "good" : "plain"}>{pendingPosts.length === 0 ? "Nothing scheduled" : `${pendingPosts.length} waiting`}</Chip>}
        >
          {pendingPosts.length === 0 ? (
            <p className="text-sm text-muted">Nothing is scheduled.</p>
          ) : (
            <ul className="space-y-3">
              {pendingPosts.map((p) => (
                <PostRow key={p.id} post={p}>
                  <button
                    type="button"
                    className={dangerButton}
                    disabled={pending}
                    onClick={async () => {
                      if (!(await confirmDialog({ title: "Cancel this scheduled post?", confirmLabel: "Cancel post", tone: "danger" }))) return;
                      start(async () => {
                        const r = await cancelPost(p.id);
                        if (r.ok) setPosts(r.data);
                        else setError(r.error);
                      });
                    }}
                  >
                    Cancel
                  </button>
                </PostRow>
              ))}
            </ul>
          )}
        </CollapsibleCard>
      </PanelGrid>

      {finished.length > 0 && (
        <CollapsibleCard
          id="sched-finished"
          title="Recently finished"
          hint="Posts that were sent, failed or cancelled."
          defaultOpen={failed > 0}
          summary={<Chip tone={failed > 0 ? "bad" : "plain"}>{failed > 0 ? `${failed} failed` : `${finished.length} finished`}</Chip>}
        >
          <ul className="space-y-3">
            {finished.map((p) => (
              <PostRow key={p.id} post={p} />
            ))}
          </ul>
        </CollapsibleCard>
      )}
    </div>
  );
}

function PostRow({ post, children }: { post: ScheduledPost; children?: React.ReactNode }) {
  const status = STATUS[post.status];
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-surface-border bg-background/40 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className={`font-medium ${status.tone}`}>{status.label}</span> · #{post.channelName ?? "unknown channel"} · {new Date(post.sendAt).toLocaleString()}
        </p>
        <p className="mt-1 line-clamp-2 text-sm whitespace-pre-wrap text-muted">{post.text}</p>
        <p className="mt-1 text-xs text-muted">Scheduled by {post.createdByName ?? "someone"}{post.error ? ` · ${post.error}` : ""}</p>
      </div>
      {children}
    </li>
  );
}
