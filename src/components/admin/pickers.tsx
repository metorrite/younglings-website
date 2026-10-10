"use client";

import { useState } from "react";
import { discordColorCss, type ForumInfo, type ForumThread, type GuildRole, type GuildStructure } from "@/lib/jonnybot-admin";
import { inputClass } from "./ui";

/** Pickers fed by the bot's live view of the server, so only roles/channels that exist can be chosen. */

export function RoleSelect({
  roles,
  value,
  onChange,
  none = "None",
  disabled = false,
}: {
  roles: GuildRole[];
  value: string | null;
  onChange: (id: string | null) => void;
  none?: string;
  disabled?: boolean;
}) {
  const missing = value !== null && !roles.some((r) => r.id === value);
  return (
    <select className={inputClass} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{none}</option>
      {missing && <option value={value}>(deleted role)</option>}
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.name}
        </option>
      ))}
    </select>
  );
}

export function RoleMultiSelect({ roles, value, onChange }: { roles: GuildRole[]; value: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const missing = value.filter((id) => !roles.some((r) => r.id === id));

  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => {
        const on = value.includes(role.id);
        const color = discordColorCss(role.color);
        return (
          <button
            key={role.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(role.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
              on ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: color ?? "transparent" }} />
            {role.name}
          </button>
        );
      })}
      {missing.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed
          onClick={() => toggle(id)}
          className="rounded-full border border-red-500/40 px-3 py-1 text-xs text-red-300"
          title="This role was deleted — click to remove it"
        >
          deleted role ✕
        </button>
      ))}
    </div>
  );
}

export function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: GuildStructure["categories"];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const missing = value !== null && !categories.some((c) => c.id === value);
  return (
    <select className={inputClass} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No category (top of the channel list)</option>
      {missing && <option value={value}>(deleted category)</option>}
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}

const FORUM_PREFIX = "forum:";

/**
 * Picks one place JonnyBot can post: a text or announcement channel, or a thread inside a forum. A forum can't be posted in directly, so
 * choosing one reveals a second list of its threads and the thread is what gets chosen. Only ever one value comes out: picking a text
 * channel afterwards clears the forum and its thread, so a stale thread can't ride along. The second list fades in and out.
 *
 * Pass `forums` and `threads` (see `choicesOf`) to offer forums; leave them out, or pass `allowForums={false}`, where only a text channel
 * will do (signups post through text channels).
 */
export function ChannelSelect({
  channels,
  forums = [],
  threads = [],
  value,
  onChange,
  none = "None",
  onlyPostable = false,
  allowForums = true,
  exclude = [],
}: {
  channels: GuildStructure["channels"];
  forums?: ForumInfo[];
  threads?: ForumThread[];
  value: string | null;
  onChange: (id: string | null) => void;
  none?: string;
  onlyPostable?: boolean;
  allowForums?: boolean;
  /** Ids already taken (for a list that adds one at a time), left out of the options. */
  exclude?: string[];
}) {
  const offerForums = allowForums && forums.length > 0;
  const savedThread = threads.find((t) => t.id === value);
  const [forumId, setForumId] = useState<string | null>(savedThread?.forumId ?? null);
  // keep the last forum's threads in place while the list fades out, so it doesn't collapse into an empty box mid-animation
  const [lastForum, setLastForum] = useState<string | null>(forumId);
  const shownForum = forumId ?? lastForum;

  const options = (onlyPostable ? channels.filter((c) => c.canPost) : channels).filter((c) => !exclude.includes(c.id));
  const forumOptions = offerForums ? forums.filter((f) => !onlyPostable || f.canPost) : [];
  const forumThreads = threads.filter((t) => t.forumId === shownForum && !exclude.includes(t.id));
  const known = channels.some((c) => c.id === value) || savedThread !== undefined;
  const missing = value !== null && !known;

  const mainValue = forumId !== null ? `${FORUM_PREFIX}${forumId}` : (value ?? "");

  function pickMain(next: string) {
    if (next.startsWith(FORUM_PREFIX)) {
      const id = next.slice(FORUM_PREFIX.length);
      setForumId(id);
      setLastForum(id);
      onChange(null); // a forum alone can't be posted in, so nothing is chosen until a thread is
      return;
    }
    setForumId(null); // a text channel replaces any forum and thread
    onChange(next || null);
  }

  const forum = forums.find((f) => f.id === shownForum);
  return (
    <div>
      <select className={inputClass} value={mainValue} onChange={(e) => pickMain(e.target.value)}>
        <option value="">{none}</option>
        {missing && <option value={value ?? ""}>(deleted channel)</option>}
        {options.map((channel) => (
          <option key={channel.id} value={channel.id}>
            #{channel.name}
            {channel.category ? ` — ${channel.category}` : ""}
          </option>
        ))}
        {forumOptions.length > 0 && (
          <optgroup label="Forums (choose a thread next)">
            {forumOptions.map((f) => (
              <option key={f.id} value={`${FORUM_PREFIX}${f.id}`} disabled={!f.canPost}>
                {f.name} — forum{f.canPost ? "" : " (JonnyBot can't post here)"}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {offerForums && (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${forumId !== null ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          aria-hidden={forumId === null}
          inert={forumId === null}
        >
          <div className="overflow-hidden">
            <div className="pt-2">
              <label className="block text-xs text-muted">
                A thread in {forum ? forum.name : "the forum"}
                <select className={`${inputClass} mt-1`} value={savedThread && savedThread.forumId === shownForum ? savedThread.id : ""} onChange={(e) => onChange(e.target.value || null)}>
                  <option value="">Choose a thread…</option>
                  {forumThreads.map((thread) => (
                    <option key={thread.id} value={thread.id} disabled={!thread.canPost}>
                      {thread.name}
                      {thread.archived ? " (archived)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {forumThreads.length === 0 && <p className="mt-1 text-xs text-muted">This forum has no posts yet. Make one in Discord, then reload this page.</p>}
              {forumThreads.some((t) => t.archived) && <p className="mt-1 text-xs text-muted">An archived thread is opened again when JonnyBot posts in it.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
