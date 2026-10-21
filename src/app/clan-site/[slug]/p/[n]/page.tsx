import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/clansite/Blocks";
import { SiteHeading } from "@/components/clansite/SiteShell";
import { siteContext, sitePage } from "@/lib/clanSitePage";

const KEYS = { "1": "custom1", "2": "custom2", "3": "custom3" } as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; n: string }> }): Promise<Metadata> {
  const { slug, n } = await params;
  const key = KEYS[n as keyof typeof KEYS];
  const ctx = key ? await siteContext(slug) : null;
  return { title: ctx?.pages.find((p) => p.key === key)?.title ?? "Page" };
}

/** One of the clan's up to three own pages: a title and its blocks. */
export default async function CustomPage({ params }: { params: Promise<{ slug: string; n: string }> }) {
  const { slug, n } = await params;
  const key = KEYS[n as keyof typeof KEYS];
  if (!key) notFound();
  const { site, page } = await sitePage(slug, key);
  return (
    <>
      <SiteHeading title={page.title} />
      <Blocks blocks={site.blocks} page={key} />
    </>
  );
}
