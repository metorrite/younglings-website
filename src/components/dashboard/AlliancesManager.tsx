"use client";

import { confirmDialog } from "@/components/ui/Dialogs";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  dangerButton,
  FormField,
  formatUtc,
  ghostButton,
  inputClass,
  Notice,
  primaryButton,
  StatusBadge,
} from "@/components/admin/ui";
import { CollapsibleCard, Chip } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import type { Alliance, AllianceEvents, AllianceList, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Result = Promise<WelcomeActionResult<AllianceList>>;

export interface AllianceActions {
  create: (name: string) => Result;
  invite: (id: string, slug: string) => Result;
  accept: (id: string) => Result;
  leave: (id: string) => Result;
  remove: (id: string, clanGuildId: string) => Result;
}

/** This server's alliances: start one, answer invitations, invite clans by their directory address, and see the shared calendar. */
export function AlliancesManager({
  initial,
  calendars,
  actions,
  eventsHref,
}: {
  initial: AllianceList;
  calendars: Record<string, AllianceEvents["events"]>;
  actions: AllianceActions;
  eventsHref: string;
}) {
  const [data, setData] = useState(initial);
  const [name, setName] = useState("");
  const [slugs, setSlugs] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(call: () => Result, message: string, after?: () => void) {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await call();
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setData(result.data);
      setNote(message);
      after?.();
    });
  }

  const invitations = data.alliances.filter((a) => a.status === "INVITED");
  const active = data.alliances.filter((a) => a.status === "ACTIVE");

  return (
    <div className="space-y-6">
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      {invitations.length > 0 && (
        <section className="space-y-3 rounded-xl border border-gold/40 bg-gold/5 p-5">
          <h2 className="font-semibold text-gold">Invitations</h2>
          {invitations.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                You&apos;ve been invited to <span className="font-semibold">{a.name}</span>
                {a.members.filter((m) => m.status === "ACTIVE").length > 0 && (
                  <span className="text-muted"> with {a.members.filter((m) => m.status === "ACTIVE").map((m) => m.name).join(", ")}</span>
                )}
                .
              </p>
              <span className="flex gap-2">
                <button type="button" className={primaryButton} disabled={pending} onClick={() => run(() => actions.accept(a.id), `You joined ${a.name}.`)}>
                  Join
                </button>
                <button type="button" className={ghostButton} disabled={pending} onClick={() => run(() => actions.leave(a.id), "Invitation declined.")}>
                  Decline
                </button>
              </span>
            </div>
          ))}
        </section>
      )}

      {active.length === 0 ? (
        <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">Your clan isn&apos;t in an alliance yet. Start one below.</p>
      ) : (
        <PanelGrid min="26rem">
          {active.map((a) => <AllianceCard key={a.id} alliance={a} events={calendars[a.id] ?? []} slug={slugs[a.id] ?? ""} setSlug={(v) => setSlugs({ ...slugs, [a.id]: v })} pending={pending} run={run} actions={actions} eventsHref={eventsHref} />)}
        </PanelGrid>
      )}

      <CollapsibleCard
        id="alliance-start"
        title="Start an alliance"
        hint={`A server can be in ${data.maxPerServer} alliances and an alliance holds up to ${data.maxMembers} clans.`}
        defaultOpen={active.length === 0}
        summary={<Chip>{active.length} joined</Chip>}
      >
        <p className="text-xs text-muted">You invite clans afterwards, by the address they have in the clan directory.</p>
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Alliance name" size="md">
            <input className={inputClass} value={name} maxLength={40} placeholder="Alliance name" onChange={(e) => setName(e.target.value)} />
          </FormField>
          <button type="button" className={primaryButton} disabled={pending || name.trim().length < 3} onClick={() => run(() => actions.create(name), "Alliance started.", () => setName(""))}>
            Start alliance
          </button>
        </div>
      </CollapsibleCard>
    </div>
  );
}

function AllianceCard({
  alliance,
  events,
  slug,
  setSlug,
  pending,
  run,
  actions,
  eventsHref,
}: {
  alliance: Alliance;
  events: AllianceEvents["events"];
  slug: string;
  setSlug: (v: string) => void;
  pending: boolean;
  run: (call: () => Result, message: string, after?: () => void) => void;
  actions: AllianceActions;
  eventsHref: string;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-surface-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-gold">{alliance.name}</h2>
        <button
          type="button"
          className={dangerButton}
          disabled={pending}
          onClick={async () => (await confirmDialog({ title: `Leave ${alliance.name}?`, body: "You'll stop seeing each other's events.", confirmLabel: "Leave", tone: "danger" })) && run(() => actions.leave(alliance.id), `You left ${alliance.name}.`)}
        >
          Leave
        </button>
      </div>

      <ul className="divide-y divide-surface-border">
        {alliance.members.map((m) => (
          <li key={m.guildId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span>
              {m.name}
              {m.you && <span className="text-xs text-muted"> (you)</span>}
              {m.founder && <span className="text-xs text-muted"> · founder</span>}
            </span>
            <span className="flex items-center gap-2">
              <StatusBadge tone={m.status === "ACTIVE" ? "good" : "muted"}>{m.status === "ACTIVE" ? "Member" : "Invited"}</StatusBadge>
              {alliance.founder && !m.you && (
                <button
                  type="button"
                  className="inline-flex min-h-6 items-center text-xs text-red-400 underline"
                  disabled={pending}
                  onClick={async () => (await confirmDialog({ title: `Remove ${m.name} from the alliance?`, confirmLabel: "Remove", tone: "danger" })) && run(() => actions.remove(alliance.id, m.guildId), `${m.name} was removed.`)}
                >
                  Remove
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <div className="w-80 max-w-full">
          <input className={inputClass} value={slug} placeholder="Clan's directory address" aria-label="Clan directory address" onChange={(e) => setSlug(e.target.value)} />
        </div>
        <button type="button" className={ghostButton} disabled={pending || !slug.trim()} onClick={() => run(() => actions.invite(alliance.id, slug), "Invitation sent.", () => setSlug(""))}>
          Invite clan
        </button>
      </div>

      <div>
        <h3 className="text-sm font-medium">Shared calendar</h3>
        {events.length === 0 ? (
          <p className="mt-1 text-sm text-muted">
            Nothing shared yet. Choose &ldquo;Allies&rdquo; for an event on the{" "}
            <Link href={eventsHref} className="text-gold hover:underline">
              Public events page
            </Link>{" "}
            and it shows up here for every clan in the alliance.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-surface-border">
            {events.map((e) => (
              <li key={`${e.clan}-${e.id}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  <a href={e.url} target="_blank" rel="noreferrer noopener" className="font-medium hover:underline">
                    {e.name}
                  </a>
                  <span className="block text-xs text-muted">
                    {e.clan}
                    {e.yours ? " (you)" : ""} · {formatUtc(e.startTime)}
                    {e.location ? ` · ${e.location}` : ""}
                  </span>
                </span>
                {e.scope === "PUBLIC" && <StatusBadge tone="good">Public</StatusBadge>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
