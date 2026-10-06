import { OG_SIZE, ogCard } from "@/lib/og";
import { compact, getProfile, rankColor } from "@/lib/site";

export const alt = "Younglings member profile";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The preview card shown when a member's profile link is pasted into Discord or a social site. */
export default async function Image({ params }: { params: Promise<{ rsn: string }> }) {
  const { rsn: raw } = await params;
  const rsn = decodeURIComponent(raw);
  const profile = await getProfile(rsn);

  if (!profile) return ogCard(rsn, "Younglings clan member", []);

  return ogCard(
    profile.rsn,
    `${profile.rank} · in the clan since ${new Date(`${profile.joined}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })}`,
    [
      { label: "Total level", value: String(profile.totalLevel ?? "—") },
      { label: "Total XP", value: compact(profile.totalXp) },
      { label: "This week", value: `+${compact(profile.gains.week)}` },
      { label: "Citadel caps", value: String(profile.citadel.caps) },
    ],
    profile.accentColor ?? rankColor(profile.rankOrder, 11),
  );
}
