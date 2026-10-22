/**
 * Calendar files (RFC 5545) for events: the one-event "Add to calendar" download and the subscribable feeds (T-192). No imports, so the node
 * tests load it directly.
 */
export interface IcsEvent {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  startTime: string;
  endTime?: string | null;
  url: string;
}

/** Whether the subscribable calendar feeds are switched on (CALENDAR_FEEDS=true). Off by default: the feed URLs answer 404. */
export const calendarFeedsOn = (): boolean => process.env.CALENDAR_FEEDS === "true";

/** UTC basic format: 20261103T190000Z. */
function stamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** TEXT value escaping: backslash, semicolon, comma, and newlines as \n. */
export function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds a content line to at most 75 octets per line (continuation lines start with one space), never splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines lose one octet to the leading space
    if (size + bytes > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function eventLines(event: IcsEvent, now: string, uidDomain: string): string[] {
  const end = event.endTime ?? new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000).toISOString();
  const description = event.description ? `${event.description}\n\n${event.url}` : event.url;
  return [
    "BEGIN:VEVENT",
    `UID:${event.id}@${uidDomain}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(event.startTime)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(event.name)}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    `URL:${event.url}`,
    "END:VEVENT",
  ];
}

/**
 * A whole VCALENDAR. `name` (a feed's title in calendar apps) and `refreshHours` (how often a subscribed app should look again) are only set for
 * feeds. `now` is the DTSTAMP, passed in so tests are stable.
 */
export function buildCalendar(events: IcsEvent[], opts: { name?: string; refreshHours?: number; uidDomain?: string; now?: string } = {}): string {
  const now = opts.now ?? new Date().toISOString();
  const uidDomain = opts.uidDomain ?? "younglings";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Younglings//Events//EN",
    "CALSCALE:GREGORIAN",
    ...(opts.name ? ["METHOD:PUBLISH", `X-WR-CALNAME:${escapeText(opts.name)}`] : []),
    ...(opts.refreshHours ? [`REFRESH-INTERVAL;VALUE=DURATION:PT${opts.refreshHours}H`, `X-PUBLISHED-TTL:PT${opts.refreshHours}H`] : []),
    ...events.flatMap((e) => eventLines(e, now, uidDomain)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** The response for a calendar body: a download for one event, inline for a feed so calendar apps read it. */
export function calendarResponse(body: string, filename: string, feed: boolean): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `${feed ? "inline" : "attachment"}; filename="${filename}"`,
      ...(feed ? { "Cache-Control": "public, max-age=900" } : {}),
    },
  });
}

/** A file name from an event or clan name: lower-case words joined by dashes. */
export function icsFilename(name: string): string {
  return `${name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "events"}.ics`;
}

/** The webcal:// form of a feed's https address (calendar apps open it as "subscribe"). */
export function webcalHref(httpsUrl: string): string {
  return httpsUrl.replace(/^https?:\/\//, "webcal://");
}
