"use client";

import type { ReactNode } from "react";
import type { GuildRole } from "@/lib/jonnybot-admin";
import { RoleMultiSelect } from "./pickers";
import { FormField, inputClass } from "./ui";

/** What an admin can write in a ticket's welcome line or embedded message, and what each one becomes. Mirrors the bot's TicketText. */
export const PLACEHOLDERS: { token: string; meaning: string }[] = [
  { token: "{user}", meaning: "a mention of whoever opened the ticket" },
  { token: "{number}", meaning: "the ticket number, like 0042" },
  { token: "{panel}", meaning: "the panel's title" },
  { token: "{type}", meaning: "the dropdown choice that routed the ticket, such as a tier" },
  { token: "{rsn}", meaning: "their linked RuneScape name" },
  { token: "{ping}", meaning: "a mention of the role pinged for the ticket" },
  { token: "{helpers}", meaning: "a mention of each helper who joined" },
];

export const DEFAULT_SUPPORT = "Support will be with you shortly.\nTo close this press the close button.";

type Messages = { openingMessage: string; welcomeText: string };

function Mention({ children }: { children: ReactNode }) {
  return <span className="rounded bg-[#5865f2]/30 px-1 text-[#c9cdfb]">{children}</span>;
}

/** A ticket's wording with every placeholder replaced by an example, the way Discord would show it. */
function filled(text: string, panelTitle: string): ReactNode[] {
  return text.split(/(\{[a-z]+\})/g).map((part, i) => {
    switch (part) {
      case "{user}":
        return <Mention key={i}>@Member</Mention>;
      case "{ping}":
        return <Mention key={i}>@Helpers</Mention>;
      case "{helpers}":
        return "nobody yet";
      case "{number}":
        return "0001";
      case "{panel}":
        return panelTitle || "Panel title";
      case "{type}":
        return "Elite";
      case "{rsn}":
        return "Metorrite";
      default:
        return part;
    }
  });
}

/**
 * The two pieces of wording a ticket opens with, and a preview laid out like the real message: a plain-text
 * welcome line, the embedded message, an info block with the member's answers, and the buttons.
 */
export function MessageFields({
  value,
  onChange,
  panelTitle,
  questions,
  pingsRole,
  usesHelpers,
}: {
  value: Messages;
  onChange: (change: Partial<Messages>) => void;
  panelTitle: string;
  questions: string[];
  /** Whether a role is pinged when a ticket opens, so the preview can show where the ping lands. */
  pingsRole: boolean;
  usesHelpers: boolean;
}) {
  const welcome = value.openingMessage.trim() || "{user} Welcome";
  const embed = value.welcomeText.trim() || DEFAULT_SUPPORT;

  return (
    <>
      <FormField
        label="Welcome message"
        hint="Plain text at the very top of every new ticket, the line that notifies people. Leave it empty for “{user} Welcome”."
      >
        <input
          className={inputClass}
          value={value.openingMessage}
          maxLength={500}
          placeholder="{user} Welcome"
          onChange={(e) => onChange({ openingMessage: e.target.value })}
        />
      </FormField>
      <FormField
        label="Embedded message"
        hint={`The boxed message under it. Leave it empty for the standard “${DEFAULT_SUPPORT.split("\n")[0]}” text.`}
      >
        <textarea
          className={`${inputClass} min-h-20`}
          value={value.welcomeText}
          maxLength={1000}
          placeholder={DEFAULT_SUPPORT}
          onChange={(e) => onChange({ welcomeText: e.target.value })}
        />
      </FormField>
      <div className="rounded-md border border-surface-border bg-background/40 p-3 text-xs text-muted">
        <p className="mb-1.5 font-medium text-foreground">Placeholders both messages can use</p>
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {PLACEHOLDERS.map((p) => (
            <li key={p.token}>
              <code className="text-foreground">{p.token}</code> {p.meaning}
            </li>
          ))}
        </ul>
        <p className="mt-2">
          If the welcome message has no <code className="text-foreground">{"{ping}"}</code>, the pinged role is added on a line of its own so the ping still reaches them.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">How a new ticket will look</p>
        <div className="space-y-2 rounded-lg border border-surface-border bg-background/60 p-3 text-sm">
          <p className="whitespace-pre-wrap">
            {filled(welcome, panelTitle)}
            {pingsRole && !welcome.includes("{ping}") && (
              <>
                {"\n🔔 "}
                <Mention>@Helpers</Mention>
              </>
            )}
          </p>
          <div className="rounded border-l-4 border-gold bg-surface p-3">
            <p className="whitespace-pre-wrap">{filled(embed, panelTitle)}</p>
            {usesHelpers && <p className="mt-3 italic text-muted">Nobody has joined yet — press Join as helper to take this one.</p>}
            <p className="mt-2 text-xs text-muted">
              Ticket #0001 · {panelTitle || "Panel title"}
            </p>
          </div>
          <div className="space-y-2 rounded border-l-4 border-gold bg-surface p-3">
            {["RuneScape name", ...questions.slice(0, 2)].map((question, i) => (
              <div key={i}>
                <p className="font-semibold">{question || "Question"}</p>
                <p className="mt-1 rounded bg-black/30 px-2 py-1 font-mono text-xs text-muted">{i === 0 ? "Metorrite" : "their answer appears here"}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            {usesHelpers && <span className="rounded bg-emerald-600/80 px-3 py-1 text-xs font-medium text-white">Join as helper</span>}
            <span className="rounded bg-red-600/80 px-3 py-1 text-xs font-medium text-white">🔒 Close</span>
          </div>
        </div>
      </div>
    </>
  );
}

type Closing = { closeByRequester: boolean; closeByHelpers: boolean; closeRoleIds: string[] };

/** Who may press Close on this panel's tickets. Staff roles and admins always can, so they aren't listed here. */
export function ClosingFields({ value, onChange, roles }: { value: Closing; onChange: (change: Partial<Closing>) => void; roles: GuildRole[] }) {
  return (
    <>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={value.closeByRequester} onChange={(e) => onChange({ closeByRequester: e.target.checked })} />
        The person who opened the ticket
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={value.closeByHelpers} onChange={(e) => onChange({ closeByHelpers: e.target.checked })} />
        Helpers who joined the ticket
      </label>
      <FormField as="group" label="Also these roles" hint="They can close any ticket on the panel, and they can see its tickets.">
        <RoleMultiSelect roles={roles} value={value.closeRoleIds} onChange={(ids) => onChange({ closeRoleIds: ids })} />
      </FormField>
    </>
  );
}
