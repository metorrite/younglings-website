"use client";

import { useState, useTransition } from "react";
import { confirmDialog } from "@/components/ui/Dialogs";
import { ChannelSelect, RoleSelect } from "@/components/admin/pickers";
import { dangerButton, FormField, formatUtc, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { choicesOf, type GuildRole, type GuildStructure, type ServerReminderList, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Result = Promise<WelcomeActionResult<ServerReminderList>>;

export interface ServerReminderActions {
  create: (draft: { channelId: string; text: string; roleId: string | null; startAt: string; everyMinutes: number | null }) => Result;
  cancel: (id: string) => Result;
}

type Problem = { title: string; items: string[] } | null;

const REPEATS = [
  { minutes: 0, label: "Once" },
  { minutes: 60 * 24, label: "Every day" },
  { minutes: 60 * 24 * 7, label: "Every week" },
];

const everyLabel = (minutes: number | null) => {
  if (minutes === null) return "once";
  if (minutes % (60 * 24 * 7) === 0) return minutes === 60 * 24 * 7 ? "every week" : `every ${minutes / (60 * 24 * 7)} weeks`;
  if (minutes % (60 * 24) === 0) return minutes === 60 * 24 ? "every day" : `every ${minutes / (60 * 24)} days`;
  if (minutes % 60 === 0) return minutes === 60 ? "every hour" : `every ${minutes / 60} hours`;
  return `every ${minutes} minutes`;
};

/**
 * Reminders JonnyBot posts in a channel for everyone, once or on a repeat, with an optional role ping (a personal reminder to yourself is `/remindme` in Discord).
 * The form comes first and the active reminders sit beside it. Basic is the message, the channel, when, and once / daily / weekly; Advanced adds the role ping and
 * a repeat of your own in hours or days. Anything already saved stays visible. The same reminders can be made in Discord with `/serverreminder`.
 */
export function ServerRemindersManager({
  initial,
  structure,
  roles,
  actions,
}: {
  initial: ServerReminderList;
  structure: GuildStructure;
  roles: GuildRole[];
  actions: ServerReminderActions;
}) {
  const [list, setList] = useState(initial);
  const [text, setText] = useState("");
  const [channelId, setChannelId] = useState<string | null>(null);
  const [when, setWhen] = useState("");
  const [everyMinutes, setEveryMinutes] = useState(0);
  const [customHours, setCustomHours] = useState("");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const usesExtras = initial.reminders.some((r) => r.roleId !== null || (r.everyMinutes !== null && !REPEATS.some((p) => p.minutes === r.everyMinutes)));
  const showExtras = advanced || usesExtras || roleId !== null || customHours !== "";
  const active = list.reminders.filter((r) => r.status === "ACTIVE");
  const finished = list.reminders.filter((r) => r.status !== "ACTIVE");
  const customMinutes = customHours === "" ? 0 : Math.round(Number(customHours) * 60);
  const repeat = customHours !== "" ? customMinutes : everyMinutes;

  function create() {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await actions.create({
        channelId: channelId!,
        text,
        roleId,
        startAt: new Date(when).toISOString(),
        everyMinutes: repeat > 0 ? repeat : null,
      });
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setList(result.data);
      setText("");
      setNote("Saved. It posts within about half a minute of the time you chose.");
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="26rem">
        <CollapsibleCard
          id="sr-new"
          title="New reminder"
          hint="A message JonnyBot posts in a channel for everyone."
          defaultOpen
          info="Only the role you choose is pinged: @everyone, @here and anyone named in the text are not. A repeating reminder never comes more often than every hour, and if JonnyBot was offline it posts once when it is back, not once per missed run. A reminder that can't be posted any more (the channel is gone) stops and is marked failed."
        >
          <FormField label="Message" size="lg">
            <textarea className={`${inputClass} min-h-28`} value={text} maxLength={list.maxText} onChange={(e) => setText(e.target.value)} placeholder="Weekly cap party starts in an hour at the Citadel!" aria-label="Reminder text" />
          </FormField>
          <FieldGrid>
            <FormField label="Channel" size="md" as="group">
              <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={channelId} onChange={setChannelId} none="Choose a channel…" />
            </FormField>
            <FormField label="First post (your local time)" size="md">
              <input type="datetime-local" className={inputClass} value={when} onChange={(e) => setWhen(e.target.value)} />
            </FormField>
          </FieldGrid>
          <FormField label="Repeat" as="group" size="lg">
            <div className="flex flex-wrap items-center gap-2">
              {REPEATS.map((r) => (
                <button
                  key={r.minutes}
                  type="button"
                  aria-pressed={customHours === "" && everyMinutes === r.minutes}
                  onClick={() => { setEveryMinutes(r.minutes); setCustomHours(""); }}
                  className={`rounded-full border px-3 py-1 text-xs transition ${customHours === "" && everyMinutes === r.minutes ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
                >
                  {r.label}
                </button>
              ))}
              {showExtras && (
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  or every
                  <span className="w-20">
                    <input type="number" min={list.minEveryMinutes / 60} max={list.maxEveryMinutes / 60} className={inputClass} aria-label="Hours between posts" value={customHours} onChange={(e) => setCustomHours(e.target.value)} />
                  </span>
                  hours
                </span>
              )}
            </div>
          </FormField>
          {showExtras ? (
            <FormField label="Ping a role (optional)" size="md" info="The role must be mentionable in Discord, or JonnyBot needs the Mention Everyone permission.">
              <RoleSelect roles={roles.filter((r) => r.id)} value={roleId} onChange={setRoleId} none="Nobody" />
            </FormField>
          ) : (
            <MoreInAdvanced>pinging a role and a repeat of your own in hours.</MoreInAdvanced>
          )}
          <button type="button" className={primaryButton} disabled={pending || !text.trim() || !channelId || !when} onClick={create}>
            {pending ? "Working…" : "Save the reminder"}
          </button>
        </CollapsibleCard>

        <CollapsibleCard
          id="sr-active"
          title="Active"
          hint="Reminders that will post."
          defaultOpen
          summary={<Chip tone={active.length > 0 ? "good" : "plain"}>{active.length === 0 ? "None" : `${active.length} of ${list.maxActive}`}</Chip>}
        >
          {active.length === 0 ? (
            <p className="text-sm text-muted">No reminders are active.</p>
          ) : (
            <ul className="space-y-3">
              {active.map((r) => (
                <li key={r.id} className="rounded-lg border border-surface-border p-3 text-sm">
                  <p className="font-medium">#{r.channelName ?? "deleted channel"} · {everyLabel(r.everyMinutes)}{r.roleName ? ` · pings @${r.roleName}` : ""}</p>
                  <p className="mt-1 whitespace-pre-wrap">{r.text}</p>
                  <p className="mt-1 text-xs text-muted">
                    Next {formatUtc(r.nextAt)} · made by {r.createdByName}
                    {r.sendCount > 0 ? ` · posted ${r.sendCount} time${r.sendCount === 1 ? "" : "s"}` : ""}
                  </p>
                  <button
                    type="button"
                    className={`${dangerButton} mt-2`}
                    disabled={pending}
                    onClick={async () => {
                      if (!(await confirmDialog({ title: "Cancel this reminder?", confirmLabel: "Cancel reminder", tone: "danger" }))) return;
                      setProblem(null);
                      setNote(null);
                      start(async () => {
                        const result = await actions.cancel(r.id);
                        if (!result.ok) return setProblem({ title: result.error, items: result.problems });
                        setList(result.data);
                        setNote("Cancelled.");
                      });
                    }}
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>
      </PanelGrid>

      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      {finished.length > 0 && (
        <CollapsibleCard
          id="sr-finished"
          title="Recently finished"
          hint="Reminders that were posted, cancelled or stopped."
          defaultOpen={finished.some((r) => r.status === "FAILED")}
          summary={<Chip tone={finished.some((r) => r.status === "FAILED") ? "bad" : "plain"}>{finished.some((r) => r.status === "FAILED") ? "One stopped" : `${finished.length} finished`}</Chip>}
        >
          <ul className="space-y-2 text-sm">
            {finished.map((r) => (
              <li key={r.id} className="rounded-md border border-surface-border px-3 py-2">
                <span className="font-medium">#{r.channelName ?? "deleted channel"}</span>
                <span className="text-muted"> · {r.status === "DONE" ? "posted" : r.status === "CANCELLED" ? "cancelled" : "stopped"}{r.error ? `: ${r.error}` : ""} · {r.text.length > 80 ? `${r.text.slice(0, 79)}…` : r.text}</span>
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      )}
    </div>
  );
}
