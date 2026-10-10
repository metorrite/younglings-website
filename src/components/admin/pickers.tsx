"use client";

import { discordColorCss, type GuildRole, type GuildStructure } from "@/lib/jonnybot-admin";
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

export function ChannelSelect({
  channels,
  value,
  onChange,
  none = "None",
  onlyPostable = false,
}: {
  channels: GuildStructure["channels"];
  value: string | null;
  onChange: (id: string | null) => void;
  none?: string;
  onlyPostable?: boolean;
}) {
  const options = onlyPostable ? channels.filter((c) => c.canPost) : channels;
  const missing = value !== null && !channels.some((c) => c.id === value);
  return (
    <select className={inputClass} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{none}</option>
      {missing && <option value={value}>(deleted channel)</option>}
      {options.map((channel) => (
        <option key={channel.id} value={channel.id}>
          #{channel.name}
          {channel.category ? ` — ${channel.category}` : ""}
        </option>
      ))}
    </select>
  );
}
