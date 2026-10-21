/** A clan-site address with no published site behind it (an unknown slug, a draft, a site that was taken down). */
export default function NoClanSite() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Clan website</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">There&apos;s no clan website here</h1>
      <p className="mt-3 max-w-md text-sm text-muted">This address isn&apos;t a published clan site. If it&apos;s yours, publish it from the Clan website page of the JonnyBot dashboard.</p>
    </main>
  );
}
