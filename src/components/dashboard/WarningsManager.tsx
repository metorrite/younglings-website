"use client";

import { useMemo, useState, useTransition } from "react";
import {
  dangerButton,
  formatUtc,
  inputClass,
  Notice,
} from "@/components/admin/ui";
import type { WarningList, WelcomeActionResult } from "@/lib/jonnybot-admin";

export interface WarningActions {
  remove: (id: string) => Promise<WelcomeActionResult<WarningList>>;
}

/** The latest warnings, searchable by member, each with a way to take it back. */
export function WarningsManager({
  initial,
  actions,
}: {
  initial: WarningList;
  actions: WarningActions;
}) {
  const [list, setList] = useState(initial);
  const [query, setQuery] = useState("");
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list.warnings;
    return list.warnings.filter(
      (w) =>
        (w.userName ?? "").toLowerCase().includes(q) ||
        w.userId.includes(q) ||
        w.reason.toLowerCase().includes(q),
    );
  }, [list, query]);

  function remove(id: string) {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await actions.remove(id);
      if (!result.ok)
        return setProblem({ title: result.error, items: result.problems });
      setList(result.data);
      setNote("Warning removed.");
    });
  }

  return (
    <div className="space-y-4">
      {problem && (
        <Notice tone="error" title={problem.title} items={problem.items} />
      )}
      {note && <Notice tone="success" title={note} />}

      <input
        className={`${inputClass} max-w-md`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by member or reason"
        aria-label="Search warnings"
      />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">
          {list.warnings.length === 0
            ? "Nobody has been warned yet."
            : "No warning matches that search."}
        </p>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {shown.map((w) => (
            <li
              key={w.id}
              className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {w.userName ?? "Someone who left"}{" "}
                  <span className="text-xs font-normal text-muted">
                    #{w.id}
                  </span>
                </p>
                <p className="text-xs text-muted">{formatUtc(w.createdAt)}</p>
              </div>
              <p className="break-words whitespace-pre-wrap text-sm">
                {w.reason}
              </p>
              <p className="text-xs text-muted">
                Warned by {w.moderatorName ?? "someone who left"}
              </p>
              <div className="mt-auto">
                <button
                  type="button"
                  className={dangerButton}
                  disabled={pending}
                  onClick={() =>
                    window.confirm("Take back this warning?") && remove(w.id)
                  }
                >
                  Take back
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {list.warnings.length >= list.limit && (
        <p className="text-xs text-muted">
          Showing the latest {list.limit}. Use /warn list in Discord for one member&apos;s full history.
        </p>
      )}
    </div>
  );
}
