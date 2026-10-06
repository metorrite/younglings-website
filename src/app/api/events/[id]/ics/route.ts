import { getEvents } from "@/lib/site";

/** An "Add to calendar" file for one Discord event. Everything comes from the bot's event list; the id is only used to pick one. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const events = await getEvents();
  const event = events?.find((e) => e.id === id);
  if (!event) return new Response("Event not found", { status: 404 });

  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (text: string) => text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const end = event.endTime ?? new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000).toISOString();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Younglings//Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@younglings`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.startTime)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(event.name)}`,
    ...(event.description ? [`DESCRIPTION:${escape(`${event.description}\n\n${event.url}`)}`] : [`DESCRIPTION:${escape(event.url)}`]),
    ...(event.location ? [`LOCATION:${escape(event.location)}`] : []),
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics"`,
    },
  });
}
