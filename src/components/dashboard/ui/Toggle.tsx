"use client";

import type { ReactNode } from "react";
import { InfoBubble } from "./InfoBubble";

/**
 * An on/off switch with its label, and optionally a line of detail and an "i" bubble. Use it instead of a bare checkbox for anything
 * that is plainly on or off, so the state reads at a glance.
 */
export function Toggle({
  checked,
  onChange,
  label,
  detail,
  info,
  disabled,
  trailing,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  detail?: ReactNode;
  info?: ReactNode;
  disabled?: boolean;
  /** A small chip after the label. */
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition disabled:opacity-50 ${checked ? "border-gold bg-gold/80" : "border-surface-border bg-white/10"}`}
      >
        <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all ${checked ? "left-[1.1rem]" : "left-0.5"}`} />
      </button>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {label}
          {trailing}
          {info && <InfoBubble title={label}>{info}</InfoBubble>}
        </p>
        {detail && <p className="text-xs text-muted">{detail}</p>}
      </div>
    </div>
  );
}
