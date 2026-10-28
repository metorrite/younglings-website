"use client";

import { useState, useTransition } from "react";
import { LocalTime } from "@/components/site/LocalTime";
import type { AppealPageView } from "@/lib/appeals";
import { sendAppealAction } from "./actions";

const STATUS: Record<string, string> = { OPEN: "Waiting for staff", APPROVED: "Approved", REJECTED: "Turned down" };

/** The signed-in person's appealable cases on one server, their appeals so far, and the form (T-033). */
export function AppealForm({ guildId, initial }: { guildId: string; initial: AppealPageView }) {
  const [view, setView] = useState(initial);
  const [caseNo, setCaseNo] = useState(initial.cases.find((c) => c.canAppeal)?.caseNo ?? "");
  const [text, setText] = useState("");
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const min = view.minText ?? 20;
  const max = view.maxText ?? 2000;
  const open = view.cases.filter((c) => c.canAppeal);

  const send = () =>
    start(async () => {
      setNote(null);
      const result = await sendAppealAction(guildId, caseNo, text);
      if (!result.ok) return setNote({ tone: "error", text: result.error });
      setView(result.data);
      setText("");
      setCaseNo(result.data.cases.find((c) => c.canAppeal)?.caseNo ?? "");
      setNote({ tone: "ok", text: "Sent. The server's staff will look at it; check back here for their answer." });
    });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your cases you can appeal</h2>
        {view.cases.length === 0 ? (
          <p className="text-sm text-muted">You have no ban or running timeout on this server that can be appealed.</p>
        ) : (
          <ul className="space-y-2">
            {view.cases.map((c) => (
              <li key={c.caseNo} className="rounded-lg border border-surface-border p-3 text-sm">
                <p className="font-medium">
                  Case #{c.caseNo}: {c.label}
                  {c.durationMinutes ? ` (${c.durationMinutes} minutes)` : ""}
                </p>
                <p className="text-muted">
                  <LocalTime iso={c.createdAt} /> · {c.reason}
                </p>
                {c.why && <p className="mt-1 text-xs text-amber-200">{c.why}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {open.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Appeal</h2>
          {open.length > 1 && (
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted">Which case</span>
              <select className="w-full rounded-md border border-surface-border bg-background px-3 py-2" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} disabled={pending}>
                {open.map((c) => (
                  <option key={c.caseNo} value={c.caseNo}>
                    #{c.caseNo}: {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted">Why should it be lifted? Staff read this.</span>
            <textarea
              className="min-h-40 w-full rounded-md border border-surface-border bg-background px-3 py-2"
              value={text}
              maxLength={max}
              onChange={(e) => setText(e.target.value)}
              disabled={pending}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
              disabled={pending || caseNo === "" || text.trim().length < min}
              onClick={send}
            >
              Send appeal
            </button>
            <span className="text-xs text-muted">
              {text.trim().length} of at least {min} characters
            </span>
          </div>
        </section>
      )}

      {note && (
        <p role={note.tone === "error" ? "alert" : "status"} className={`text-sm ${note.tone === "error" ? "text-red-300" : "text-emerald-300"}`}>
          {note.text}
        </p>
      )}

      {view.appeals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your appeals</h2>
          <ul className="space-y-2">
            {view.appeals.map((a) => (
              <li key={a.id} className="rounded-lg border border-surface-border p-3 text-sm">
                <p className="font-medium">
                  Case #{a.caseNo} · {STATUS[a.status] ?? a.status}
                </p>
                <p className="text-xs text-muted">
                  Sent <LocalTime iso={a.createdAt} />
                  {a.decidedAt ? (
                    <>
                      {" "}
                      · decided <LocalTime iso={a.decidedAt} />
                    </>
                  ) : null}
                </p>
                {a.note && <p className="mt-1">{a.status === "REJECTED" ? "Why: " : "Note: "}{a.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
