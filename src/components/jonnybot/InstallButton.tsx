"use client";

import { useState } from "react";

/**
 * The install button with the optional extras as checkboxes. The link starts as the minimal one; ticking an extra adds just that extra's
 * permissions to it. (Permission values go above 32 bits, so they are added, never combined with bitwise operators.)
 */
export function InstallButton({ options }: { options: { clientId: string; base: number; extras: { id: string; label: string; detail: string; value: number }[] } }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const permissions = options.base + options.extras.filter((e) => chosen.includes(e.id)).reduce((sum, e) => sum + e.value, 0);
  const href = `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(options.clientId)}&permissions=${permissions}&scope=${encodeURIComponent("bot applications.commands")}`;

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold tracking-wider text-muted uppercase">Optional extras</legend>
        {options.extras.map((e) => (
          <label key={e.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-surface-border p-3 text-sm transition hover:border-gold/50">
            <input type="checkbox" className="mt-1" checked={chosen.includes(e.id)} onChange={(ev) => setChosen((c) => (ev.target.checked ? [...c, e.id] : c.filter((x) => x !== e.id)))} />
            <span>
              <span className="block font-medium">{e.label}</span>
              <span className="block text-muted">{e.detail}</span>
            </span>
          </label>
        ))}
        <p className="text-xs text-muted">Leave these off and JonnyBot works as before; the features that need them simply say they lack the permission. You can also add them later from Server Settings, then Roles.</p>
      </fieldset>
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752c4]">
        Add to Discord
      </a>
    </div>
  );
}
