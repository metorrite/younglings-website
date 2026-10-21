import type { Metadata } from "next";
import { Blocks } from "@/components/clansite/Blocks";
import { SiteCard, SiteHeading } from "@/components/clansite/SiteShell";
import { sitePage } from "@/lib/clanSitePage";
import { safeHref } from "@/lib/miniMarkdown";

export const metadata: Metadata = { title: "Apply" };

/** Whether the clan is recruiting, what it asks for, and its apply link (from the clan profile), plus any of its own blocks. */
export default async function Apply({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { site, page } = await sitePage(slug, "apply");
  const { clan } = site;
  const applyUrl = clan.applyUrl ? safeHref(clan.applyUrl) : null;
  const closed = clan.recruiting.key === "CLOSED";
  return (
    <>
      <SiteHeading title={page.title} sub={clan.recruiting.label} />
      <div className="space-y-6">
        {clan.requirements && (
          <SiteCard>
            <h2 className="mb-2 font-semibold">What we ask</h2>
            <p className="whitespace-pre-line text-sm text-[var(--cs-muted)]">{clan.requirements}</p>
          </SiteCard>
        )}
        <Blocks blocks={site.blocks} page="apply" />
        {applyUrl && !closed ? (
          <a href={applyUrl} rel="noopener noreferrer" target="_blank" className="inline-block rounded-md bg-[var(--cs-primary)] px-5 py-2.5 font-semibold text-white hover:opacity-90">
            Apply to join
          </a>
        ) : (
          <p className="text-sm text-[var(--cs-muted)]">{closed ? "We are not recruiting right now." : "Ask in game or on our Discord to join."}</p>
        )}
      </div>
    </>
  );
}
