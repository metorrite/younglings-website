/**
 * What shows in the page area the moment another page is asked for, while the bot answers: the shape of a page (a title and a few panels) rather than the
 * previous page staying put with nothing to say a click was heard. The sidebar stays where it is.
 */
export default function GuildPageLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading the page" className="animate-pulse space-y-6">
      <div className="space-y-3 border-b border-surface-border pb-5">
        <div className="h-7 w-56 rounded bg-white/15" />
        <div className="h-4 w-full max-w-xl rounded bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg border border-surface-border bg-white/[0.06]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 rounded-xl border border-surface-border bg-white/[0.06]" />
        <div className="h-48 rounded-xl border border-surface-border bg-white/[0.06]" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
