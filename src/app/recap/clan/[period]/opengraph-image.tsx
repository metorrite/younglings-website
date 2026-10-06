import { OG_SIZE, ogCard } from "@/lib/og";
import { compact, full, getRecap } from "@/lib/site";

export const alt = "Younglings clan recap";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;
  const recap = await getRecap("clan", decodeURIComponent(period));
  if (!recap) return ogCard("Clan recap", "Younglings", []);

  return ogCard(recap.subject.name, `Clan recap — ${recap.period.label}`, [
    { label: "XP gained", value: compact(recap.xp.total) },
    { label: "Active members", value: String(recap.activeMembers ?? 0) },
    { label: "Boss kills", value: recap.activity.hidden ? "—" : full(recap.activity.bossKills) },
    { label: "Citadel caps", value: String(recap.citadel.capWeeks ?? 0) },
  ]);
}

