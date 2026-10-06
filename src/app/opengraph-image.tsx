import { OG_SIZE, ogCard } from "@/lib/og";
import { compact, getOverview } from "@/lib/site";

export const alt = "Younglings — a RuneScape clan";
export const size = OG_SIZE;
export const contentType = "image/png";
// Needs live data, which doesn't exist at build time — render on request.
export const dynamic = "force-dynamic";

export default async function Image() {
  const overview = await getOverview();
  return ogCard(
    overview?.clan.name ?? "Younglings",
    "A RuneScape clan on Discord",
    overview
      ? [
          { label: "Members", value: String(overview.clan.memberCount) },
          { label: "XP this week", value: compact(overview.clan.xpWeek) },
          { label: "Combined XP", value: compact(overview.clan.totalXp) },
        ]
      : [],
  );
}
