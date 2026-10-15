/**
 * Shown the moment a dashboard link is clicked, while the page asks the bot for its data. Without it nothing changes on screen until the bot has
 * answered, which on a slow page feels like the click didn't register. The sidebar stays (it belongs to the layout); only the page area is replaced.
 */
export default function DashboardPageLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-3 border-b border-surface-border pb-5">
        <div className="h-7 w-56 animate-pulse rounded-md bg-surface-border/60" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-md bg-surface-border/40" />
      </div>
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-xl border border-surface-border bg-surface" />
        <div className="h-64 animate-pulse rounded-xl border border-surface-border bg-surface" />
      </div>
    </div>
  );
}
