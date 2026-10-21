"use client";

import { useMemo, useState, useTransition } from "react";
import { FormField, formatUtc, ghostButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { RolePicker } from "@/components/dashboard/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { GuildRole, ModerationCase, ModerationOverview, ModerationSettings, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

export interface ModerationActions {
  save: (settings: ModerationSettings) => Promise<WelcomeActionResult<ModerationOverview>>;
  editReason: (caseNo: string, reason: string) => Promise<WelcomeActionResult<ModerationCase>>;
  lookUp: (by: "user" | "moderator", id: string) => Promise<WelcomeActionResult<ModerationCase[]>>;
}

const TONE: Record<string, string> = {
  BAN: "bg-red-500/15 text-red-300",
  SOFTBAN: "bg-red-500/15 text-red-300",
  KICK: "bg-amber-500/15 text-amber-300",
  TIMEOUT: "bg-amber-500/15 text-amber-300",
  WARN: "bg-white/10 text-muted",
  UNBAN: "bg-emerald-500/15 text-emerald-300",
  UNTIMEOUT: "bg-emerald-500/15 text-emerald-300",
};

const SOURCE: Record<string, string> = { COMMAND: "a command", WARN: "/warn", AUTOPUNISH: "Autopunish", AUTOMOD: "Automod", HONEYPOT: "the honeypot", SERVER_TAG: "server-tag moderation" };

function span(minutes: number): string {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  return [d && `${d} day${d === 1 ? "" : "s"}`, h && `${h} hour${h === 1 ? "" : "s"}`, m && `${m} minute${m === 1 ? "" : "s"}`].filter(Boolean).join(" ");
}

function CaseRow({ c, onSaved, editReason }: { c: ModerationCase; onSaved: (next: ModerationCase) => void; editReason: ModerationActions["editReason"] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(c.reason);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();

  function save() {
    setOutcome(null);
    start(async () => {
      const result = await editReason(c.caseNo, draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      onSaved(result.data);
      setOutcome({ tone: "success", title: "Reason updated." });
    });
  }

  return (
    <section className="rounded-lg border border-surface-border bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="font-semibold">Case #{c.caseNo}</span>
          <span className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[c.action] ?? "bg-white/10 text-muted"}`}>{c.actionLabel}</span>
          {c.durationMinutes !== null && <span className="ml-2 text-xs text-muted">{span(c.durationMinutes)}</span>}
          <span className="mt-0.5 block text-sm">
            {c.userName} <span className="text-xs text-muted">by {c.moderatorName}</span>
          </span>
          <span className="mt-0.5 block truncate text-sm text-muted">{c.reason}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
          {formatUtc(c.createdAt)}
          <span aria-hidden="true">{open ? "▴" : "▾"}</span>
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-surface-border p-4">
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div><dt className="inline text-muted">Member: </dt><dd className="inline">{c.userName} <code className="text-xs text-muted">{c.userId}</code></dd></div>
            <div><dt className="inline text-muted">Moderator: </dt><dd className="inline">{c.moderatorName} <code className="text-xs text-muted">{c.moderatorId}</code></dd></div>
            <div><dt className="inline text-muted">From: </dt><dd className="inline">{SOURCE[c.source] ?? c.source}</dd></div>
            {c.editedAt && <div><dt className="inline text-muted">Reason edited: </dt><dd className="inline">{formatUtc(c.editedAt)}</dd></div>}
          </dl>
          {c.originalReason && <p className="text-xs text-muted">First reason: {c.originalReason}</p>}
          <FormField label="Reason" size="lg">
            <textarea className={`${inputClass} min-h-20`} value={draft} maxLength={500} onChange={(e) => { setDraft(e.target.value); setOutcome(null); }} />
          </FormField>
          {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
          <button type="button" className={primaryButton} disabled={pending || draft.trim() === "" || draft.trim() === c.reason} onClick={save}>
            {pending ? "Saving…" : "Save reason"}
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * The Moderation page: the server's numbered cases (search the latest, or look up every case of one member or moderator by their Discord id,
 * open one to fix its reason) and what members are told. Basic or Advanced makes no difference here: the settings are few and all of them
 * matter. Ban, kick and timeout are slash commands, not buttons here, because the bot checks the role hierarchy against the moderator
 * who runs them.
 */
export function ModerationManager({ initial, roles, actions }: { initial: ModerationOverview; roles: GuildRole[]; actions: ModerationActions }) {
  const [saved, setSaved] = useState(initial.settings);
  const [draft, setDraft] = useState(initial.settings);
  const [cases, setCases] = useState<ModerationCase[]>(initial.cases);
  const [query, setQuery] = useState("");
  const [looked, setLooked] = useState<{ label: string } | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [problem, setProblem] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const change = (patch: Partial<ModerationSettings>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((c) => c.userName.toLowerCase().includes(q) || c.moderatorName.toLowerCase().includes(q) || c.userId.includes(q) || c.moderatorId.includes(q) || c.reason.toLowerCase().includes(q) || c.caseNo === q.replace("#", ""));
  }, [cases, query]);

  const isId = /^\d{5,19}$/.test(query.trim());

  function lookUp(by: "user" | "moderator") {
    setProblem(null);
    start(async () => {
      const result = await actions.lookUp(by, query.trim());
      if (!result.ok) return setProblem({ tone: "error", title: result.error, items: result.problems });
      setCases(result.data);
      setLooked({ label: `${by === "user" ? "Cases for member" : "Cases by moderator"} ${query.trim()}` });
      setQuery("");
    });
  }

  function showLatest() {
    setCases(initial.cases);
    setLooked(null);
  }

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await actions.save(draft);
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data.settings);
      setDraft(result.data.settings);
      setOutcome({ tone: "success", title: "Saved." });
    });
  }

  return (
    <div className="space-y-6">
      <CollapsibleCard id="moderation-cases" title="Cases" hint="Newest first. Search the latest, or look up everything for one member or moderator by their Discord id." defaultOpen summary={<Chip>{looked ? looked.label : `latest ${cases.length}`}</Chip>}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${inputClass} max-w-md`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, case number, reason or Discord id" aria-label="Search cases" />
            {isId && (
              <>
                <button type="button" className={ghostButton} disabled={pending} onClick={() => lookUp("user")}>All cases for this member</button>
                <button type="button" className={ghostButton} disabled={pending} onClick={() => lookUp("moderator")}>All cases by this moderator</button>
              </>
            )}
            {looked && <button type="button" className={ghostButton} onClick={showLatest}>Back to the latest</button>}
          </div>
          {problem && <Notice tone={problem.tone} title={problem.title} items={problem.items} />}
          {shown.length === 0 ? (
            <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">
              {cases.length === 0 ? "No moderation cases yet. Warnings, and anything done with /ban, /kick or /timeout once those are switched on, show up here." : "No case matches that search."}
            </p>
          ) : (
            <div className="space-y-3">
              {shown.map((c) => (
                <CaseRow key={c.caseNo} c={c} editReason={actions.editReason} onSaved={(next) => setCases((all) => all.map((x) => (x.caseNo === next.caseNo ? next : x)))} />
              ))}
            </div>
          )}
          {!looked && cases.length >= initial.limit && <p className="text-xs text-muted">Showing the latest {initial.limit}. Look a member up by id to see their whole history.</p>}
        </div>
      </CollapsibleCard>

      <PanelGrid min="22rem" max="max-content">
        <CollapsibleCard id="moderation-dm" title="What members are told" hint="The message a member gets when they are banned, kicked or timed out." defaultOpen summary={<Chip tone={saved.dmReason ? "good" : "plain"}>{saved.dmReason ? "DM on" : "DM off"}</Chip>}>
          <div className="space-y-4">
            <Toggle checked={draft.dmReason} onChange={(on) => change({ dmReason: on })} label="Tell them by DM" detail="They are sent what happened and the reason before it takes effect. A member with closed DMs is moderated anyway." />
            <Toggle checked={draft.showModerator} onChange={(on) => change({ showModerator: on })} label="Name the moderator in that message" detail="Off by default: members are told the reason, not who." disabled={!draft.dmReason} />
            <FormField label="Appeal link" hint="Added to the message so a member can appeal. Leave empty for none." size="lg">
              <input className={inputClass} value={draft.appealUrl ?? ""} maxLength={200} placeholder="https://example.com/appeal" onChange={(e) => change({ appealUrl: e.target.value })} />
            </FormField>
          </div>
        </CollapsibleCard>

        <CollapsibleCard id="moderation-protected" title="Protected roles" hint="Members holding one of these can never be banned, kicked or timed out, whoever asks." defaultOpen={draft.protectedRoleIds.length > 0} summary={<Chip>{saved.protectedRoleIds.length === 0 ? "none" : `${saved.protectedRoleIds.length} role${saved.protectedRoleIds.length === 1 ? "" : "s"}`}</Chip>}>
          <RolePicker roles={roles} value={draft.protectedRoleIds} max={initial.maxProtectedRoles} disabled={false} onChange={(ids) => change({ protectedRoleIds: ids })} />
          <p className="mt-2 text-xs text-muted">The server owner, JonnyBot and the person giving the command are always protected. Moderators also can&apos;t act on anyone at or above their own highest role.</p>
        </CollapsibleCard>
      </PanelGrid>

      <SaveBar pending={pending} onSave={submit} outcome={outcome} dirty={dirty} onDiscard={() => { setDraft(saved); setOutcome(null); }} />
    </div>
  );
}
