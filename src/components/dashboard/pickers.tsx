"use client";

import { useState } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { ghostButton, inputClass } from "@/components/admin/ui";
import { discordColorCss, type ForumInfo, type ForumThread, type GuildRole, type GuildStructure } from "@/lib/jonnybot-admin";

/** The chosen roles as removable pills plus a dropdown for the rest, which stays usable on a server with hundreds of roles. */
export function RolePicker({ roles, value, max, disabled, onChange }: { roles: GuildRole[]; value: string[]; max: number; disabled: boolean; onChange: (ids: string[]) => void }) {
  const [adding, setAdding] = useState("");
  const byId = new Map(roles.map((r) => [r.id, r]));
  const available = roles.filter((r) => !value.includes(r.id)).sort((a, b) => b.position - a.position);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.length === 0 && <span className="text-xs text-muted">No roles yet.</span>}
        {value.map((id) => {
          const role = byId.get(id);
          const color = role ? discordColorCss(role.color) : undefined;
          return (
            <span key={id} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${role ? "border-surface-border" : "border-red-500/40 text-red-300"}`}>
              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: color ?? "transparent" }} />
              {role ? role.name : "(deleted role)"}
              {!disabled && (
                <button type="button" aria-label={`Remove ${role ? role.name : "deleted role"}`} className="text-muted hover:text-red-400" onClick={() => onChange(value.filter((v) => v !== id))}>
                  ✕
                </button>
              )}
            </span>
          );
        })}
      </div>
      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${inputClass} max-w-xs`} value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Add a role">
            <option value="">Add a role…</option>
            {available.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={ghostButton}
            disabled={!adding || value.length >= max}
            onClick={() => {
              onChange([...value, adding]);
              setAdding("");
            }}
          >
            + Add
          </button>
          {value.length >= max && <span className="text-xs text-muted">At most {max} roles in a group.</span>}
        </div>
      )}
    </div>
  );
}

/** A list of places to post as removable pills, plus the shared channel picker (forums and their threads included) to add more. */
export function ChannelListPicker({
  channels,
  forums = [],
  threads = [],
  value,
  max,
  disabled = false,
  empty,
  allowForums = true,
  onChange,
}: {
  channels: GuildStructure["channels"];
  forums?: ForumInfo[];
  threads?: ForumThread[];
  value: string[];
  max: number;
  disabled?: boolean;
  /** What an empty list means, shown instead of a bare "none". */
  empty: string;
  allowForums?: boolean;
  onChange: (ids: string[]) => void;
}) {
  const [adding, setAdding] = useState<string | null>(null);
  const names = new Map<string, string>();
  channels.forEach((c) => names.set(c.id, `#${c.name}`));
  threads.forEach((t) => names.set(t.id, `${forums.find((f) => f.id === t.forumId)?.name ?? "forum"} › ${t.name}`));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.length === 0 && <span className="text-xs text-muted">{empty}</span>}
        {value.map((id) => {
          const name = names.get(id);
          return (
            <span key={id} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${name ? "border-surface-border" : "border-red-500/40 text-red-300"}`}>
              {name ?? "(deleted channel)"}
              {!disabled && (
                <button type="button" aria-label={`Remove ${name ?? "deleted channel"}`} className="text-muted hover:text-red-400" onClick={() => onChange(value.filter((v) => v !== id))}>
                  ✕
                </button>
              )}
            </span>
          );
        })}
      </div>
      {!disabled && (
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 max-w-xs flex-1">
            <ChannelSelect channels={channels} forums={forums} threads={threads} allowForums={allowForums} onlyPostable value={adding} onChange={setAdding} none="Add a channel…" exclude={value} />
          </div>
          <button type="button" className={ghostButton} disabled={!adding || value.length >= max} onClick={() => { if (adding) onChange([...value, adding]); setAdding(null); }}>
            + Add
          </button>
          {value.length >= max && <span className="text-xs text-muted">At most {max} channels.</span>}
        </div>
      )}
    </div>
  );
}
