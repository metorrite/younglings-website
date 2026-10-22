/** The reference line under a generic error page (the error's digest), so a bug report can quote it and the server log can be searched for it. */
export function ErrorReference({ reference }: { reference: string | null }) {
  if (!reference) return null;
  return (
    <p className="mt-3 text-xs text-muted">
      Reference: <code className="select-all font-mono">{reference}</code>
    </p>
  );
}
