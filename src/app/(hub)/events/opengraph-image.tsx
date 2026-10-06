import { OG_SIZE, ogCard } from "@/lib/og";
import { getEvents } from "@/lib/site";

export const alt = "Younglings events";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/** The preview card for a pasted link to the events page: the next event and how many are coming. */
export default async function Image() {
  const events = await getEvents();
  const next = events?.[0];
  return ogCard(
    "Events",
    next ? `Next up: ${next.name}` : "What's coming up in the Younglings Discord",
    events ? [{ label: "Upcoming", value: String(events.length) }, ...(next ? [{ label: "Next", value: new Date(next.startTime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) }] : [])] : [],
  );
}
