// Run with: node --test tests/*.test.mjs   (Node 22.18+/24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { buildCalendar, calendarFeedsOn, escapeText, foldLine, icsFilename, webcalHref } from "../src/lib/ics.ts";

const NOW = "2026-10-22T01:00:00.000Z";
const EVENT = { id: "42", name: "Raids, then Vorago; bring food", description: "Line one\nLine two", location: "World 84", startTime: "2026-11-03T19:00:00.000Z", endTime: null, url: "https://discord.com/events/1/42" };

afterEach(() => delete process.env.CALENDAR_FEEDS);

test("text values are escaped (comma, semicolon, backslash, newline)", () => {
  assert.equal(escapeText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});

test("an event becomes one VEVENT with UTC times and a one-hour default end", () => {
  const ics = buildCalendar([EVENT], { now: NOW });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics, /\r\nDTSTART:20261103T190000Z\r\n/);
  assert.match(ics, /\r\nDTEND:20261103T200000Z\r\n/);
  assert.match(ics, /\r\nDTSTAMP:20261022T010000Z\r\n/);
  assert.match(ics, /\r\nSUMMARY:Raids\\, then Vorago\\; bring food\r\n/);
  assert.match(ics, /\r\nUID:42@younglings\r\n/);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 1);
});

test("a feed carries its name and refresh interval; a single download doesn't", () => {
  const feed = buildCalendar([EVENT, { ...EVENT, id: "43" }], { name: "Younglings events", refreshHours: 3, uidDomain: "rsclans", now: NOW });
  assert.match(feed, /\r\nX-WR-CALNAME:Younglings events\r\n/);
  assert.match(feed, /\r\nREFRESH-INTERVAL;VALUE=DURATION:PT3H\r\n/);
  assert.match(feed, /\r\nUID:43@rsclans\r\n/);
  assert.equal(feed.match(/BEGIN:VEVENT/g).length, 2);
  assert.doesNotMatch(buildCalendar([EVENT], { now: NOW }), /X-WR-CALNAME/);
});

test("an empty feed is still a valid calendar", () => {
  assert.equal(buildCalendar([], { name: "x", now: NOW }).includes("BEGIN:VEVENT"), false);
});

test("long lines fold at 75 octets without splitting a character", () => {
  const long = "DESCRIPTION:" + "é".repeat(100);
  const folded = foldLine(long);
  const enc = new TextEncoder();
  for (const line of folded.split("\r\n")) assert.ok(enc.encode(line).length <= 75, `line too long: ${enc.encode(line).length}`);
  assert.equal(folded.split("\r\n").map((l, i) => (i === 0 ? l : l.slice(1))).join(""), long);
  assert.equal(foldLine("SHORT:x"), "SHORT:x");
});

test("feeds are off unless CALENDAR_FEEDS=true", () => {
  assert.equal(calendarFeedsOn(), false);
  process.env.CALENDAR_FEEDS = "true";
  assert.equal(calendarFeedsOn(), true);
});

test("file names and webcal addresses", () => {
  assert.equal(icsFilename("The Younglings!"), "the-younglings.ics");
  assert.equal(icsFilename("!!!"), "events.ics");
  assert.equal(webcalHref("https://api.example/api/v1/clans/x/calendar.ics"), "webcal://api.example/api/v1/clans/x/calendar.ics");
});
