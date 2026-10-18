"use client";

import type { ReactNode } from "react";
import { InfoBubble } from "./InfoBubble";
import { Toggle } from "./Toggle";

/**
 * One thing that can be switched on, with the options that belong to it kept visibly under it: a switch, a title (the thing), a line on what it does, and
 * below that, set in from the left behind a rule, the controls that only matter while it is on. Rows stack with a gap between them, so where one thing's
 * options end and the next thing begins is never in doubt. Switched off, the options fold away (and say why in `offHint` if given).
 * <p>
 * Without {@code checked} it is a titled group with no switch, for a thing that is always there.
 */
export function SettingRow({
  title,
  hint,
  info,
  checked,
  onChange,
  disabled,
  offHint,
  badge,
  children,
}: {
  title: string;
  hint?: ReactNode;
  info?: ReactNode;
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** Shown instead of the options while it is off. */
  offHint?: ReactNode;
  /** A small chip beside the title ("Default", "Needs setup"). */
  badge?: ReactNode;
  children?: ReactNode;
}) {
  const on = checked !== false;
  return (
    <section className={`rounded-lg border bg-background/40 transition ${on ? "border-surface-border" : "border-surface-border/60"}`}>
      <div className="px-4 pt-4 pb-3">
        {checked === undefined || !onChange ? (
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              {title}
              {badge}
              {info && <InfoBubble title={title}>{info}</InfoBubble>}
            </p>
            {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
          </div>
        ) : (
          <Toggle
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            label={title}
            detail={hint}
            info={info}
            trailing={badge}
          />
        )}
      </div>
      {on && children && <div className="mx-4 mb-4 ml-[3.25rem] space-y-3 border-l-2 border-surface-border pl-4">{children}</div>}
      {!on && offHint && <p className="mx-4 mb-3 ml-[3.25rem] text-xs text-muted">{offHint}</p>}
    </section>
  );
}
