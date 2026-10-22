"use client";

import { useState, useTransition } from "react";
import { blockSubjectAction, removeLinkAction, resolveDisputeAction, revealDiscordAction, searchLinksAction, unblockAction } from "@/app/admin/(console)/rs-link/actions";
import { XP_CHECK, verifyWords } from "@/lib/rslink/verify";
import { SUBJECT_LABELS, subjectProblem, type RsLinkBlock, type RsLinkDispute, type RsLinkSide, type SubjectKind } from "@/lib/rsnLinkAdmin";
import { Card, FormField, Notice, StatusBadge, dangerButton, formatUtc, ghostButton, inputClass, primaryButton } from "./ui";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const DURATIONS: { label: string; hours: number }[] = [
  { label: "1 hour", hours: 1 },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
  { label: "365 days", hours: 24 * 365 },
];

/** The parts of the RS Link abuse view that change things: blocks, disputes, and finding, removing or revealing a link. Owner only. */
export function RsLinkAbuseView({ initialBlocks, initialDisputes, loadProblems }: { initialBlocks: RsLinkBlock[]; initialDisputes: RsLinkDispute[]; loadProblems: string[] }) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [disputes, setDisputes] = useState(initialDisputes);
  const [kind, setKind] = useState<SubjectKind>("ip");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(24);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rsn, setRsn] = useState("");
  const [found, setFound] = useState<RsLinkSide[] | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run<T>(work: () => Promise<Result<T>>, onOk: (data: T) => void, message: string) {
    setError(null);
    setSaved(null);
    start(async () => {
      const result = await work();
      if (!result.ok) return setError(result.error);
      onOk(result.data);
      setSaved(message);
    });
  }

  const typedProblem = value.trim() ? subjectProblem(kind, value) : null;
  const open = disputes.filter((d) => d.status === "open");
  const settled = disputes.filter((d) => d.status !== "open").slice(0, 10);

  return (
    <div className="space-y-6">
      {loadProblems.length > 0 && <Notice tone="error" title="Some parts didn't load" items={loadProblems} />}
      {error && <Notice tone="error" title="That didn't work" items={[error]} />}
      {saved && <Notice tone="success" title={saved} />}

      <Card
        title="Names claimed twice"
        hint="Two characters said they own the same name within 30 days. Neither can be proven yet, so the newer claim waits here instead of being refused. The one you pick keeps the name; the other link ends."
      >
        {open.length === 0 ? (
          <p className="text-sm text-muted">No open disputes.</p>
        ) : (
          <ul className="space-y-4">
            {open.map((d) => (
              <li key={d.id} className="rounded-lg border border-white/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold">{d.rsn}</span>
                  <span className="text-sm text-muted">opened {formatUtc(d.openedAt)}</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Side title="Linked first" side={d.incumbent} />
                  <Side title="New claim" side={d.claimant} />
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <FormField label="Note (optional)" size="lg">
                    <input className={inputClass} maxLength={200} value={notes[d.id] ?? ""} onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })} />
                  </FormField>
                  <button type="button" className={ghostButton} disabled={pending} onClick={() => run(() => resolveDisputeAction(d.id, "incumbent", notes[d.id] ?? ""), (x) => setDisputes(x.disputes), "Kept the first link.")}>
                    Keep the first link
                  </button>
                  <button type="button" className={ghostButton} disabled={pending} onClick={() => run(() => resolveDisputeAction(d.id, "claimant", notes[d.id] ?? ""), (x) => setDisputes(x.disputes), "Gave the name to the new claim.")}>
                    Give it to the new claim
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {settled.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">Recently settled ({settled.length})</summary>
            <ul className="mt-2 divide-y divide-white/10">
              {settled.map((d) => (
                <li key={d.id} className="flex flex-wrap gap-3 py-1.5">
                  <span className="font-medium">{d.rsn}</span>
                  <span className="text-muted">{d.status.replace(/_/g, " ")}</span>
                  <span className="text-muted">{formatUtc(d.resolvedAt)}</span>
                  {d.note && <span>{d.note}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <Card title="Blocks" hint="A blocked IP, Discord account, tracking id or name gets the same answer as a rate limit, so it learns nothing. Automatic blocks last 24 hours.">
        {blocks.length === 0 ? (
          <p className="text-sm text-muted">Nothing is blocked.</p>
        ) : (
          <ul className="divide-y divide-white/10 text-sm">
            {blocks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="w-24 text-muted">{SUBJECT_LABELS[b.subjectKind] ?? b.subjectKind}</span>
                <code>{b.subject}</code>
                <span className="flex-1">{b.reason}</span>
                <span className="text-muted">until {formatUtc(b.until)}</span>
                <span className="text-muted">{b.createdBy === "auto" ? "automatic" : "by you"}</span>
                <button type="button" className={ghostButton} disabled={pending} onClick={() => run(() => unblockAction(b.id), (x) => setBlocks(x.blocks), "Unblocked.")}>
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
          <FormField label="What to block" size="md">
            <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as SubjectKind)}>
              <option value="ip">IP address</option>
              <option value="discord">Discord user id</option>
              <option value="tracking">Tracking id</option>
              <option value="rsn">RuneScape name</option>
            </select>
          </FormField>
          <FormField label="Value" size="md" hint="Only its fingerprint is stored.">
            <input className={inputClass} value={value} maxLength={45} onChange={(e) => setValue(e.target.value)} />
          </FormField>
          <FormField label="For" size="md">
            <select className={inputClass} value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              {DURATIONS.map((d) => (
                <option key={d.hours} value={d.hours}>
                  {d.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Reason (optional)" size="lg">
            <input className={inputClass} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>
        {typedProblem && <p className="text-sm text-red-300">{typedProblem}</p>}
        <button
          type="button"
          className={primaryButton}
          disabled={pending || !value.trim() || !!typedProblem}
          onClick={() =>
            run(() => blockSubjectAction(kind, value, reason, hours), (x) => {
              setBlocks(x.blocks);
              setValue("");
              setReason("");
            }, "Blocked.")
          }
        >
          Block
        </button>
      </Card>

      <Card title="Find a link" hint="Every link on a name, current and ended in the last 30 days. Removing one ends it and signs its plugin out; the player sees it ended on their links page.">
        <div className="flex flex-wrap items-end gap-2">
          <FormField label="RuneScape name" size="md">
            <input className={inputClass} value={rsn} maxLength={12} onChange={(e) => setRsn(e.target.value)} />
          </FormField>
          <button type="button" className={primaryButton} disabled={pending || !rsn.trim()} onClick={() => run(() => searchLinksAction(rsn), (x) => setFound(x.links), "Searched.")}>
            Search
          </button>
        </div>
        {found && found.length === 0 && <p className="text-sm text-muted">No links on that name.</p>}
        {found && found.length > 0 && (
          <ul className="space-y-3">
            {found.map((l) => (
              <li key={l.linkId} className="rounded-lg border border-white/10 p-3">
                <Side title={l.rsn ?? "Link"} side={l} />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {revealed[l.linkId] ? (
                    <span className="text-sm">
                      Discord: <code>{revealed[l.linkId]}</code>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={ghostButton}
                      disabled={pending}
                      onClick={() =>
                        run(() => revealDiscordAction(l.linkId), (x) => setRevealed({ ...revealed, [l.linkId]: `${x.discordName ? `@${x.discordName} ` : ""}${x.discordId}` }), "Shown (this is recorded).")
                      }
                    >
                      Show Discord account
                    </button>
                  )}
                  {(l.status === "active" || l.status === "disputed") && (
                    <button
                      type="button"
                      className={dangerButton}
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm(`Remove the link for ${l.rsn}? Its plugin is signed out.`)) return;
                        run(() => removeLinkAction(l.linkId, "removed by the owner"), (x) => setFound(found.map((f) => (f.linkId === x.link.linkId ? x.link : f))), "Link removed.");
                      }}
                    >
                      Remove link
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** The "plugin knew it first" check for one link, with the numbers (owner only). */
function SideVerify({ side }: { side: RsLinkSide }) {
  const words = verifyWords(side.verification, side.verify?.[XP_CHECK], true);
  if (!words) return null;
  return <div className={words.tone === "good" ? "text-emerald-300" : words.tone === "warn" ? "text-amber-300" : "text-muted"}>{words.text}</div>;
}

function Side({ title, side }: { title: string; side: RsLinkSide | null }) {
  if (!side) return <div className="text-sm text-muted">{title}: gone</div>;
  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{title}</span>
        <StatusBadge tone={side.status === "active" ? "good" : side.status === "disputed" ? "warn" : "muted"}>{side.status}</StatusBadge>
        {side.verification && side.verification !== "implicit" && <StatusBadge tone="good">{side.verification.replace(/_/g, " ")}</StatusBadge>}
      </div>
      <SideVerify side={side} />
      <div className="text-muted">
        Linked {formatUtc(side.linkedAt ?? null)} · last seen {formatUtc(side.lastSeenAt ?? null)} · {side.tracked ? "tracking id" : "no tracking id"} · {side.devices ?? 0} device(s) · by{" "}
        {side.method === "dm" ? "DM code" : "sign-in"}
        {side.discord && (
          <>
            {" "}
            · Discord <code>{side.discord}</code>
          </>
        )}
      </div>
    </div>
  );
}
