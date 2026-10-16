"use client";

/* eslint-disable @next/next/no-img-element -- fixed preview pictures from /public/bingo-looks; next/image would only re-encode them */

import type { ReactNode } from "react";
import { useIsClient } from "@/components/dashboard/setup/useIsClient";
import { BINGO_LOOKS, DEFAULT_BINGO_LOOK } from "@/lib/eventTypes";
import { getPath, summaryLines, type Answers, type MissingAnswer, type OptionSchema } from "@/lib/eventOptions";
import type { GuildStructure } from "@/lib/jonnybot-admin";

/**
 * The panel beside the setup that updates as it is filled in: the event as it will be made, in words, what it still needs, and (for a bingo) what its board
 * will look like. {@code onGoTo} turns each missing answer into a link to the step that asks for it.
 */
export function LiveSummary({
  schema,
  answers,
  structure,
  missing,
  onGoTo,
  children,
  sticky = false,
}: {
  schema: OptionSchema;
  answers: Answers;
  structure: GuildStructure;
  missing: MissingAnswer[];
  onGoTo?: (step: string) => void;
  children?: ReactNode;
  sticky?: boolean;
}) {
  const channelName = (id: string) => structure.channels.find((c) => c.id === id)?.name ?? "unknown-channel";
  // dates are in the viewer's own time zone, which the server can't know: it renders UTC and the browser switches over
  const lines = summaryLines(schema, answers, channelName, useIsClient());
  const name = typeof answers.name === "string" && answers.name.trim() !== "" ? answers.name.trim() : null;

  let preview: string | null = null;
  if (schema.template === "bingo") {
    const shape = String(getPath(answers, "config.board.layout") ?? "grid") || "grid";
    const picked = String(getPath(answers, "config.board.look") ?? DEFAULT_BINGO_LOOK);
    const look = BINGO_LOOKS.some((l) => l.id === picked) ? picked : DEFAULT_BINGO_LOOK;
    preview = `/bingo-looks/${shape}-${look}.jpg`;
  }

  return (
    <aside aria-label="The event so far" className={`space-y-4 rounded-xl border border-surface-border bg-surface p-5 ${sticky ? "xl:sticky xl:top-4" : ""}`}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted">{schema.label}</p>
        <p className={`break-words text-lg font-semibold ${name ? "" : "text-muted"}`}>{name ?? "Not named yet"}</p>
      </div>
      {preview && <img src={preview} alt="What the board will look like" width={640} height={400} className="block aspect-[8/5] w-full rounded-lg border border-surface-border object-cover" />}
      <dl className="space-y-2 text-sm">
        {lines.map((line) => (
          <div key={line.label} className="grid grid-cols-[5rem_1fr] gap-2">
            <dt className="text-muted">{line.label}</dt>
            <dd className="min-w-0 break-words">{line.text}</dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-surface-border pt-3">
        {missing.length === 0 ? (
          <p className="text-sm text-emerald-300">Everything it needs is filled in.</p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-amber-300">Still needed</p>
            <ul className="space-y-1 text-sm">
              {missing.map((m) => (
                <li key={m.path + m.message} className="flex items-start gap-2">
                  <span aria-hidden className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-amber-300" />
                  {onGoTo ? (
                    <button type="button" className="text-left underline decoration-dotted underline-offset-2 hover:text-gold" onClick={() => onGoTo(m.step)}>
                      {m.message}
                    </button>
                  ) : (
                    <span>{m.message}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {children}
    </aside>
  );
}
