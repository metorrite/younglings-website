import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { InfoBubble } from "@/components/dashboard/ui/InfoBubble";

/** Shared look for the admin dashboard, matching the site's existing surface/gold theme. */

export const inputClass =
  "w-full rounded-md border border-control-border bg-background px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 disabled:opacity-50";
export const primaryButton =
  "rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-50";
export const ghostButton =
  "rounded-md border border-surface-border px-3 py-1.5 text-sm text-muted transition hover:text-foreground disabled:opacity-40";
export const dangerButton =
  "rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-40";

/** `hint` is a line shown under the title; `info` is a longer explanation tucked behind an "i" bubble beside it. */
export function Card({ title, hint, info, children }: { title?: string; hint?: ReactNode; info?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-surface-border bg-surface p-5 sm:p-6">
      {title && (
        <h2 className="flex items-center gap-2 border-b border-surface-border pb-3 text-lg font-semibold text-gold">
          {title}
          {info && <InfoBubble title={title}>{info}</InfoBubble>}
        </h2>
      )}
      {hint && <p className={`text-sm text-muted ${title ? "mt-3" : "mt-1"}`}>{hint}</p>}
      <div className={title || hint ? "mt-4 space-y-4" : "space-y-4"}>{children}</div>
    </section>
  );
}

/**
 * How wide a control is. A control is only as wide as what goes in it, never as wide as the panel it sits in:
 * `sm` (10rem) for numbers and short codes, `md` (20rem) for names, dates and drop-downs, `lg` (36rem) for long text, descriptions and pickers
 * with lists, `full` for the rare control that really should fill its space (a table, an editor).
 */
export type FieldSize = "sm" | "md" | "lg" | "full";

export const FIELD_WIDTH: Record<FieldSize, string> = { sm: "max-w-40", md: "max-w-80", lg: "max-w-xl", full: "" };

/** The size a control gets when its field doesn't say: a number is small, a one-line input or a drop-down medium, a text area and anything custom (pickers) large. */
export function defaultFieldSize(children: ReactNode): FieldSize {
  const parts = Children.toArray(children);
  if (parts.length === 1 && isValidElement(parts[0])) {
    const el = parts[0] as ReactElement<{ type?: string }>;
    if (el.type === "textarea") return "lg";
    if (el.type === "select") return "md";
    if (el.type === "input") return el.props.type === "number" ? "sm" : "md";
  }
  return "lg";
}

/**
 * A labelled question. A plain input or select goes in the default `label` form, so clicking the label focuses it. Anything with
 * buttons in it (a list of removable roles or channels, say) must use `as="group"`: inside a `label`, a click on any blank space
 * is passed on to the first button, which for a removable pill means removing it.
 * <p>
 * The hint sits under the control, not between it and the label: fields side by side then line their controls up however long
 * (or absent) each one's hint is.
 */
export function FormField({ label, hint, info, required = false, as = "label", size, children }: { label: string; hint?: ReactNode; info?: ReactNode; required?: boolean; as?: "label" | "group"; size?: FieldSize; children: ReactNode }) {
  const width = FIELD_WIDTH[size ?? defaultFieldSize(children)];
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
        {label}
        {info && <InfoBubble title={label}>{info}</InfoBubble>}
        {required && <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">Required</span>}
      </span>
      <span className={`mt-1.5 block ${width}`}>{children}</span>
      {hint && <span className="mt-1 block max-w-xl text-xs text-muted">{hint}</span>}
    </>
  );
  return as === "group" ? (
    <div role="group" aria-label={label} className="block">
      {body}
    </div>
  ) : (
    <label className="block">{body}</label>
  );
}

export function Notice({ tone, title, items }: { tone: "error" | "success"; title: string; items?: string[] }) {
  const style = tone === "error" ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-sm ${style}`}>
      <p className="font-medium">{title}</p>
      {items && items.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StatusBadge({ tone, children }: { tone: "good" | "muted" | "warn"; children: ReactNode }) {
  const style =
    tone === "good" ? "bg-emerald-500/15 text-emerald-300" : tone === "warn" ? "bg-amber-500/15 text-amber-300" : "bg-white/10 text-muted";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{children}</span>;
}

/** Fixed-format UTC timestamp — rendered on the server, so it must not depend on the viewer's locale/timezone. */
export function formatUtc(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
