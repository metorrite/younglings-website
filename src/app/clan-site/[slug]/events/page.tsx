import type { Metadata } from "next";
import { SiteCard, SiteHeading } from "@/components/clansite/SiteShell";
import { EventList } from "@/components/clansite/parts";
import { CalendarSubscribe } from "@/components/site/CalendarSubscribe";
import { sitePage } from "@/lib/clanSitePage";
import { tenantEvents } from "@/lib/clanSites";

export const metadata: Metadata = { title: "Events" };

/** The clan's upcoming events that it shares publicly (the same list as its Clans Hub page). */
export default async function Events({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { page } = await sitePage(slug, "events");
  const events = await tenantEvents(slug);
  return (
    <>
      <SiteHeading title={page.title} sub="Times are game time (UTC)." />
      <SiteCard>
        <EventList events={events} empty="No events planned right now." />
        <CalendarSubscribe path={`/api/v1/clans/${slug}/calendar.ics`} api className="mt-4" />
      </SiteCard>
    </>
  );
}
