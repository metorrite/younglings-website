import { clanEvents, getClan } from "@/lib/clansHub";
import { buildCalendar, calendarFeedsOn, calendarResponse, icsFilename } from "@/lib/ics";
import { apiError, limited, unavailable } from "@/lib/publicApi";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * GET /api/v1/clans/{slug}/calendar.ics: the events a clan shares publicly, as a feed a calendar app subscribes to. The same events as
 * /api/v1/clans/{slug}/events and the clan's hub page. Off (404) unless CALENDAR_FEEDS=true.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!calendarFeedsOn()) return apiError(404, "Not found.");
  const early = limited(request, "publicRead");
  if (early) return early;
  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 40) return apiError(404, "No such clan.");

  const clan = await getClan(slug);
  if (clan === null) return unavailable();
  if (!clan) return apiError(404, "No such clan.");
  const events = await clanEvents(slug);
  return calendarResponse(buildCalendar(events, { name: `${clan.name} events`, refreshHours: 3, uidDomain: "rsclans" }), icsFilename(clan.name), true);
}
