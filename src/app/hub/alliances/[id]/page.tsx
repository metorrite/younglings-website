import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gateHub } from "@/components/clanshub/gate";
import { ClanMark, SectionHeader, Unavailable } from "@/components/clanshub/parts";
import { clanAccent, getAlliance, withAlpha } from "@/lib/clansHub";
import { canSeeHub } from "@/lib/hubAccess";
import { hubHref } from "@/lib/siteHosts";
import { currentSite } from "@/lib/siteHostsServer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!(await canSeeHub())) return { title: "Clans Hub" };
  const alliance = await getAlliance(id);
  return alliance ? { title: alliance.name, description: `${alliance.name}, an alliance of clans on the Clans Hub` } : { title: "Alliance" };
}

/** An alliance of clans. Only clans that chose to show their alliances are named; a clan that keeps its alliances to itself is not here, and nothing says it is missing. */
export default async function AlliancePageView({ params }: { params: Promise<{ id: string }> }) {
  const closed = await gateHub();
  if (closed) return closed;
  const { id } = await params;
  const site = await currentSite();
  const alliance = await getAlliance(id);
  if (alliance === undefined) notFound();
  if (alliance === null) return <Unavailable />;

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href={hubHref(site, "/")} className="hover:text-foreground hover:underline">
          Clans
        </Link>{" "}
        / <span className="text-foreground">{alliance.name}</span>
      </nav>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight break-words sm:text-4xl">{alliance.name}</h1>
        <p className="max-w-2xl text-muted">An alliance of clans that share events with each other and have chosen to show it.</p>
      </header>
      <section aria-label="Clans in this alliance" className="space-y-4">
        <SectionHeader title="Clans" hint={`${alliance.clans.length} clans in this alliance.`} />
        <ul className="grid gap-3 md:grid-cols-2">
          {alliance.clans.map((c) => {
            const colour = clanAccent(c);
            return (
              <li key={c.slug}>
                <Link
                  href={hubHref(site, `/c/${c.slug}`)}
                  className="flex items-center gap-4 rounded-2xl border border-surface-border bg-surface p-4 transition hover:border-white/20"
                  style={{ backgroundImage: `linear-gradient(135deg, ${withAlpha(colour, 0.12)}, transparent 60%)` }}
                >
                  <ClanMark clan={c} size={56} />
                  <span className="min-w-0">
                    <span className="block font-semibold break-words">{c.name}</span>
                    {c.tagline && <span className="block text-sm break-words text-muted">{c.tagline}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
