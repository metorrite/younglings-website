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

export function FormField({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      <span className="mt-1 block">{children}</span>
    </label>
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
