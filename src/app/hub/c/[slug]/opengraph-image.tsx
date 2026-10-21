import { clanAccent, getClan } from "@/lib/clansHub";
import { hubOpen } from "@/lib/hubAccess";
import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "A clan on the Clans Hub";
export const size = OG_SIZE;
export const contentType = "image/png";

const BRAND = "CLANS HUB";

/**
 * The preview card shown when a clan's hub page is pasted into Discord or a social site: its name, tagline and colour, how big it is and
 * whether it is recruiting. Link previews are fetched by anonymous bots, so while the hub is closed (HUB_PUBLIC unset) every clan page
 * gets the plain hub card and no clan's details leave the beta.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const plain = () => ogCard("Clans Hub", "Find a RuneScape 3 clan that fits how you play", [], "#d4af37", undefined, BRAND);
  if (!hubOpen()) return plain();
  const { slug } = await params;
  const clan = await getClan(slug);
  if (!clan) return plain();
  const stats = [
    { label: "Members", value: clan.memberCount === null ? "–" : String(clan.memberCount) },
    { label: "Status", value: clan.recruiting.label },
  ];
  if (clan.focus.length > 0) stats.push({ label: "Focus", value: clan.focus[0].label });
  return ogCard(clan.name, clan.tagline || "A RuneScape 3 clan on the Clans Hub", stats, clanAccent(clan), undefined, BRAND);
}
