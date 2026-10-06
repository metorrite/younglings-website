import { OG_SIZE, ogCard } from "@/lib/og";
import { compact, full, getRecap } from "@/lib/site";

export const alt = "Younglings member recap";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ rsn: string; period: string }> }) {
  const { rsn, period } = await params;
  const recap = await getRecap("member", decodeURIComponent(period), decodeURIComponent(rsn));
  if (!recap) return ogCard(decodeURIComponent(rsn), "Recap", []);

  const rank = recap.ranking;
  return ogCard(recap.subject.name, `${recap.period.label} — recap`, [
    { label: "XP gained", value: compact(recap.xp.total) },
    { label: "Clan rank", value: rank?.inRankings && rank.rank ? `#${rank.rank}` : "—" },
    { label: "Boss kills", value: recap.activity.hidden ? "—" : full(recap.activity.bossKills) },
    { label: "Citadel caps", value: String(recap.citadel.weeksCapped ?? 0) },
  ]);
}
