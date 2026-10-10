import type { ReactNode } from "react";

/** Shared look for the admin dashboard, matching the site's existing surface/gold theme. */

export const inputClass =
  "w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold disabled:opacity-50";
export const primaryButton =
  "rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-50";
export const ghostButton =
  "rounded-md border border-surface-border px-3 py-1.5 text-sm text-muted transition hover:text-foreground disabled:opacity-40";
export const dangerButton =
  "rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-40";

export function Card({ title, hint, children }: { title?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-surface-border bg-surface p-6">
      {title && <h2 className="font-semibold text-gold">{title}</h2>}
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className={title || hint ? "mt-4 space-y-4" : "space-y-4"}>{children}</div>
    </section>
  );
}

/**
 * A labelled question. A plain input or select goes in the default `label` form, so clicking the label focuses it. Anything with
 * buttons in it (a list of removable roles or channels, say) must use `as="group"`: inside a `label`, a click on any blank space
 * is passed on to the first button, which for a removable pill means removing it.
 */
export function FormField({ label, hint, required = false, as = "label", children }: { label: string; hint?: ReactNode; required?: boolean; as?: "label" | "group"; children: ReactNode }) {
  const body = (
    <>
      <span className="text-sm font-medium">
        {label}
        {required && <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">Required</span>}
      </span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      <span className="mt-1 block">{children}</span>
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
