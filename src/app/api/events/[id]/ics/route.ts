import { buildCalendar, calendarResponse, icsFilename } from "@/lib/ics";
import { getEvents } from "@/lib/site";

/** An "Add to calendar" file for one Discord event. Everything comes from the bot's event list; the id is only used to pick one. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const events = await getEvents();
  const event = events?.find((e) => e.id === id);
  if (!event) return new Response("Event not found", { status: 404 });
  return calendarResponse(buildCalendar([event]), icsFilename(event.name), false);
}
