import type { ReactNode } from "react";

/**
 * Layout that uses the width there is. Controls are only as wide as what goes in them (see `FieldSize`), so panels and fields are not stretched to fill a row
 * either: they sit side by side as long as there is room for another one and wrap when there isn't. Nothing here needs a breakpoint, each grid works out its own
 * columns from the width it is given, so the same page lays itself out for a wide screen, beside the sidebar, or on a phone.
 */

/**
 * Panels side by side: as many columns as fit, each at least `min` wide. By default the columns share the row (`1fr`, so one panel alone fills it); give
 * `max` (a length like "36rem") to keep every column from growing past that, for panels that hold only a few small controls. Each panel is as tall as its
 * own content, so a short one next to a tall one leaves no stretched blank box. A child that should take the whole row is wrapped in {@link Span}.
 */
export function PanelGrid({ children, min = "26rem", max = "1fr", gap = "gap-4", className = "", as: Tag = "div" }: { children: ReactNode; min?: string; max?: string; gap?: string; className?: string; as?: "div" | "ul" }) {
  return (
    <Tag className={`grid items-start ${gap} ${className}`} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}), ${max}))` }}>
      {children}
    </Tag>
  );
}

/**
 * Fields side by side in columns the width of a medium control (20rem), as many as fit. A field that needs more (a long text, a list, a picture picker)
 * is wrapped in {@link Span} and takes a row of its own. Use it for a form's fields instead of a fixed two-column grid, which leaves a gap whenever the
 * controls are narrower than the column.
 */
export function FieldGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid gap-x-6 gap-y-5 ${className}`} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 20rem), 20rem))" }}>
      {children}
    </div>
  );
}

/** Takes the whole row of a {@link PanelGrid} or {@link FieldGrid}. */
export function Span({ children }: { children: ReactNode }) {
  return <div className="col-span-full">{children}</div>;
}

/** A titled box inside a panel, for a section that belongs to the panel but reads on its own (a list of unfinished setups, a list of templates). */
export function SubPanel({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-surface-border bg-background/40 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
