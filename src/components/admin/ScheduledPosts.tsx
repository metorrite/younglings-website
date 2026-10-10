"use client";

import { useState, useTransition } from "react";
import { cancelScheduledAction, schedulePostAction } from "@/app/admin/(console)/actions";
import type { ForumInfo, ForumThread, GuildStructure, ScheduledPost } from "@/lib/jonnybot-admin";
import { ChannelSelect } from "./pickers";
import { Card, dangerButton, FormField, inputClass, Notice, primaryButton } from "./ui";

const STATUS: Record<ScheduledPost["status"], { label: string; tone: string }> = {
  PENDING: { label: "Waiting", tone: "text-gold" },
  SENT: { label: "Sent", tone: "text-emerald-400" },
  FAILED: { label: "Failed", tone: "text-red-400" },
  CANCELLED: { label: "Cancelled", tone: "text-muted" },
};

export function ScheduledPosts({ initial, channels, forums, threads }: { initial: ScheduledPost[]; channels: GuildStructure["channels"]; forums?: ForumInfo[]; threads?: ForumThread[] }) {
  const [posts, setPosts] = useState(initial);
  const [text, setText] = useState("");
  const [channelId, setChannelId] = useState("");
  const [when, setWhen] = useState("");
  const [convert, setConvert] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pendingPosts = posts.filter((p) => p.status === "PENDING");
  const finished = posts.filter((p) => p.status !== "PENDING");

  function schedule() {
    setError(null);
    setMessage(null);
    start(async () => {
      const result = await schedulePostAction({ text, channelId, convert, sendAt: when });
      if (!result.ok) return setError(result.error);
      setPosts(result.data);
      setText("");
      setMessage("Scheduled. It will post within about half a minute of the time you chose.");
    });
  }

  return (
    <div className="space-y-6">
      <Card title="Schedule a message" hint="Uses the same post tags as Post a message. The text is checked now, so mistakes show up before the day it matters.">
        <textarea className={`${inputClass} min-h-44 font-mono`} value={text} maxLength={3500} onChange={(e) => setText(e.target.value)} placeholder={"### Weekly Cap Party!\nJoin us at the Citadel on Wednesday."} aria-label="Message text" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={convert} onChange={(e) => setConvert(e.target.checked)} /> Tidy plain text into headings and lists first
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Channel">
            <ChannelSelect channels={channels} forums={forums} threads={threads} onlyPostable value={channelId || null} onChange={(id) => setChannelId(id ?? "")} none="Choose a channel…" />
          </FormField>
          <FormField label="Post at (your local time)">
            <input type="datetime-local" className={inputClass} value={when} onChange={(e) => setWhen(e.target.value)} />
          </FormField>
        </div>
        <button type="button" className={primaryButton} disabled={pending || !text.trim() || !channelId || !when} onClick={schedule}>
          {pending ? "Working…" : "Schedule it"}
        </button>
      </Card>
      {error && <Notice tone="error" title={error} items={[]} />}
      {message && <Notice tone="success" title={message} items={[]} />}

      <Card title={`Waiting (${pendingPosts.length})`}>
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
                  onClick={() => {
                    if (!window.confirm("Cancel this scheduled post?")) return;
                    start(async () => {
                      const r = await cancelScheduledAction(p.id);
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
      </Card>

      {finished.length > 0 && (
        <Card title="Recently finished">
          <ul className="space-y-3">
            {finished.map((p) => (
              <PostRow key={p.id} post={p} />
            ))}
          </ul>
        </Card>
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
