import { listClans } from "@/lib/clansHub";
import { hubOpen } from "@/lib/hubAccess";
import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "Clans Hub: find a RuneScape 3 clan";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The hub's own preview card (instead of the Younglings one): what it is, and while it is open, how many clans are listed and recruiting. */
export default async function Image() {
  const clans = (await hubOpen()) ? await listClans() : null;
  const stats = clans
    ? [
        { label: "Clans listed", value: String(clans.length) },
        { label: "Recruiting", value: String(clans.filter((c) => c.recruiting.key !== "CLOSED").length) },
      ]
    : [];
  return ogCard("Clans Hub", "Find a RuneScape 3 clan that fits how you play", stats, "#d4af37", undefined, "CLANS HUB");
}
