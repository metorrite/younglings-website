import type { Metadata } from "next";
import { SiteCard, SiteHeading } from "@/components/clansite/SiteShell";
import { RecapSummary, Unavailable } from "@/components/clansite/parts";
import { sitePage } from "@/lib/clanSitePage";
import { tenantData } from "@/lib/clanSites";

export const metadata: Metadata = { title: "Recaps" };

/** Last week's and last month's clan recaps (the ones the bot already makes for the clan). */
export default async function Recaps({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { page } = await sitePage(slug, "recaps");
  const [week, month] = await Promise.all([tenantData(slug, "recap", "period=last-week"), tenantData(slug, "recap", "period=last-month")]);
  return (
    <>
      <SiteHeading title={page.title} />
      <div className="grid gap-6 md:grid-cols-2">
        <SiteCard>{week ? <RecapSummary recap={week} /> : <Unavailable />}</SiteCard>
        <SiteCard>{month ? <RecapSummary recap={month} /> : <Unavailable />}</SiteCard>
      </div>
    </>
  );
}
