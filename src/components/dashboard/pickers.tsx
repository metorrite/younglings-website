"use client";

import { useState } from "react";
import { ghostButton, inputClass } from "@/components/admin/ui";
import { discordColorCss, type GuildRole, type GuildStructure } from "@/lib/jonnybot-admin";

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

/** A list of channels as removable pills plus a dropdown for the rest. */
export function ChannelListPicker({
  channels,
  value,
  max,
  disabled = false,
  empty,
  onChange,
}: {
  channels: GuildStructure["channels"];
  value: string[];
  max: number;
  disabled?: boolean;
  /** What an empty list means, shown instead of a bare "none". */
  empty: string;
  onChange: (ids: string[]) => void;
}) {
  const [adding, setAdding] = useState("");
  const byId = new Map(channels.map((c) => [c.id, c]));
  const available = channels.filter((c) => !value.includes(c.id) && c.canPost);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.length === 0 && <span className="text-xs text-muted">{empty}</span>}
        {value.map((id) => {
          const channel = byId.get(id);
          return (
            <span key={id} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${channel ? "border-surface-border" : "border-red-500/40 text-red-300"}`}>
              {channel ? `#${channel.name}` : "(deleted channel)"}
              {!disabled && (
                <button type="button" aria-label={`Remove ${channel ? `#${channel.name}` : "deleted channel"}`} className="text-muted hover:text-red-400" onClick={() => onChange(value.filter((v) => v !== id))}>
                  ✕
                </button>
              )}
            </span>
          );
        })}
      </div>
      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${inputClass} max-w-xs`} value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Add a channel">
            <option value="">Add a channel…</option>
            {available.map((channel) => (
              <option key={channel.id} value={channel.id}>
                #{channel.name}
                {channel.category ? ` — ${channel.category}` : ""}
              </option>
            ))}
          </select>
          <button type="button" className={ghostButton} disabled={!adding || value.length >= max} onClick={() => { onChange([...value, adding]); setAdding(""); }}>
            + Add
          </button>
          {value.length >= max && <span className="text-xs text-muted">At most {max} channels.</span>}
        </div>
      )}
    </div>
  );
}
