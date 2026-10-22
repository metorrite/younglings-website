import { buildCalendar, calendarFeedsOn, calendarResponse } from "@/lib/ics";
import { limited } from "@/lib/publicApi";
import { getEvents } from "@/lib/site";

/**
 * The clan site's upcoming Discord events as a feed a calendar app subscribes to (webcal://…/api/events/calendar.ics) and refreshes on its own.
 * Off (404) unless CALENDAR_FEEDS=true. Same events as the Events page, nothing more.
 */
export async function GET(request: Request) {
  if (!calendarFeedsOn()) return new Response("Not found", { status: 404 });
  const early = limited(request, "publicRead");
  if (early) return early;
  const events = await getEvents();
  if (!events) return new Response("Events are unavailable right now.", { status: 503, headers: { "Retry-After": "300" } });
  return calendarResponse(buildCalendar(events, { name: "Younglings events", refreshHours: 3 }), "younglings-events.ics", true);
}
