/** Shown inside the persistent header while the next primary page loads, so a click answers instantly instead of freezing. */
export default function HubLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-12 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 animate-pulse rounded-md bg-white/10" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-white/5" />
      <div className="grid gap-4 pt-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl border border-surface-border bg-surface/60" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-surface-border bg-surface/60" />
    </div>
  );
}
