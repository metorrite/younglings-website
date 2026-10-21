import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gateHub } from "@/components/clanshub/gate";
import { ClanMark, RecruitingBadge, Unavailable } from "@/components/clanshub/parts";
import { clanAccent, getClan } from "@/lib/clansHub";
import { canSeeHub } from "@/lib/hubAccess";
import { clanHref, hubHref } from "@/lib/siteHosts";
import { currentSite } from "@/lib/siteHostsServer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!(await canSeeHub())) return { title: "Clans Hub" };
  const clan = await getClan(slug);
  return { title: clan ? `Apply to ${clan.name}` : "Apply" };
}

/**
 * Applying to a clan from the hub (T-070): join its Discord with the invite it shared, then send its application form (a T-038 web form,
 * which only takes answers from members of the server); sending the form opens a ticket for the clan's staff.
 */
export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const closed = await gateHub();
  if (closed) return closed;
  const { slug } = await params;
  const site = await currentSite();
  const clan = await getClan(slug);
  if (clan === undefined) notFound();
  if (clan === null) return <Unavailable />;
  const r = clan.recruitingPost;
  if (!r || clan.recruiting.key === "CLOSED" || (!r.applyFormPath && !r.inviteUrl)) notFound();
  const colour = clanAccent(clan);
  // The form page belongs to the clan-site face: on the hub's own host it is linked on the clan site's address.
  const formHref = r.applyFormPath ? (site.hubHost && site.clanOrigin ? `${site.clanOrigin}${r.applyFormPath}` : clanHref(site, r.applyFormPath)) : null;

  const step = "flex gap-4 rounded-2xl border border-surface-border bg-surface p-6";
  const num = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-black";
  const button = "mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href={hubHref(site, "/")} className="hover:text-foreground hover:underline">
          Clans
        </Link>{" "}
        /{" "}
        <Link href={hubHref(site, `/c/${clan.slug}`)} className="hover:text-foreground hover:underline">
          {clan.name}
        </Link>{" "}
        / <span className="text-foreground">Apply</span>
      </nav>
      <header className="flex items-center gap-4">
        <ClanMark clan={clan} size={64} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Apply to {clan.name}</h1>
          <div className="mt-1">
            <RecruitingBadge clan={clan} />
          </div>
        </div>
      </header>
      {r.post && <p className="break-words whitespace-pre-wrap text-muted">{r.post}</p>}
      {clan.requirements && (
        <section className="rounded-2xl border border-surface-border bg-surface p-6">
          <h2 className="font-semibold">What they ask of you</h2>
          <p className="mt-2 break-words whitespace-pre-wrap text-sm text-muted">{clan.requirements}</p>
        </section>
      )}
      <ol className="space-y-4">
        {r.inviteUrl && (
          <li className={step}>
            <span className={num} style={{ backgroundColor: colour }}>1</span>
            <div>
              <h2 className="font-semibold">Join their Discord</h2>
              <p className="mt-1 text-sm text-muted">The application is sent from inside their server, so join it first.</p>
              <a href={r.inviteUrl} target="_blank" rel="noopener noreferrer" className={button} style={{ backgroundColor: colour }}>
                Join on Discord
              </a>
            </div>
          </li>
        )}
        {formHref && (
          <li className={step}>
            <span className={num} style={{ backgroundColor: colour }}>{r.inviteUrl ? 2 : 1}</span>
            <div>
              <h2 className="font-semibold">Send the application</h2>
              <p className="mt-1 text-sm text-muted">Sign in with Discord and answer their questions. Their staff get your answers as a ticket and reply to you in their server.</p>
              <a href={formHref} className={button} style={{ backgroundColor: colour }}>
                Open the application
              </a>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
