import type { Metadata } from "next";
import { Blocks } from "@/components/clansite/Blocks";
import { SiteHeading } from "@/components/clansite/SiteShell";
import { sitePage } from "@/lib/clanSitePage";

export const metadata: Metadata = { title: "About" };

/** About the clan: its profile description and its own blocks. */
export default async function About({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { site, page } = await sitePage(slug, "about");
  const { clan } = site;
  return (
    <>
      <SiteHeading title={page.title} sub={clan.focus.map((f) => f.label).join(" · ") || undefined} />
      <div className="space-y-8">
        {clan.description && <p className="max-w-2xl whitespace-pre-line">{clan.description}</p>}
        <Blocks blocks={site.blocks} page="about" />
        {clan.timezone && <p className="text-sm text-[var(--cs-muted)]">Most of us play on {clan.timezone} time.</p>}
      </div>
    </>
  );
}
