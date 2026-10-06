import type { MemberProfile, Overview } from "@/lib/site";

export interface Badge {
  id: string;
  icon: string;
  label: string;
  description: string;
}

/** The longest run of consecutive Citadel weeks (week starts are 7 days apart) in a list of YYYY-MM-DD dates. */
export function longestStreak(weeks: string[]): number {
  const times = [...new Set(weeks)].map((w) => new Date(`${w}T00:00:00Z`).getTime()).sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  times.forEach((t, i) => {
    run = i > 0 && t - times[i - 1] === 7 * 86_400_000 ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  return longest;
}

const DAY = 86_400_000;

/** Badges a member has earned, worked out from what's on their profile and the clan's current leaderboards. */
export function badgesFor(profile: MemberProfile, overview: Overview | null): Badge[] {
  const badges: Badge[] = [];

  const caps = profile.citadel.cappedWeeks.length;
  const streak = longestStreak(profile.citadel.cappedWeeks);
  if (streak >= 3) badges.push({ id: "streak", icon: "🔥", label: `${streak}-week cap streak`, description: `Capped the Citadel ${streak} weeks in a row.` });
  if (caps >= 4) badges.push({ id: "regular", icon: "🏰", label: "Citadel regular", description: `Capped the Citadel in ${caps} different weeks.` });

  const twoHundredM = profile.skills.filter((s) => s.xp >= 200_000_000).length;
  if (twoHundredM > 0) badges.push({ id: "200m", icon: "💎", label: `200M club ×${twoHundredM}`, description: `${twoHundredM} skill${twoHundredM === 1 ? "" : "s"} at 200 million XP.` });

  if (profile.skills.length > 0 && profile.skills.every((s) => s.level >= 99)) badges.push({ id: "all99", icon: "🎓", label: "All skills 99+", description: "Every skill at level 99 or higher." });

  const days = (Date.now() - new Date(`${profile.joined}T00:00:00Z`).getTime()) / DAY;
  if (days >= 365) badges.push({ id: "veteran1", icon: "🛡️", label: "1-year veteran", description: "In the clan for over a year." });
  else if (days >= 180) badges.push({ id: "veteran6", icon: "🛡️", label: "6-month veteran", description: "In the clan for over six months." });

  const weekRank = overview?.gains.week.findIndex((g) => g.rsn.toLowerCase() === profile.rsn.toLowerCase()) ?? -1;
  if (weekRank >= 0 && weekRank < 3) badges.push({ id: "rising", icon: "🚀", label: "Rising star", description: `#${weekRank + 1} for XP gained this week.` });

  const pointsRank = overview?.topPoints.findIndex((p) => p.rsn.toLowerCase() === profile.rsn.toLowerCase()) ?? -1;
  if (pointsRank >= 0 && pointsRank < 3) badges.push({ id: "points", icon: "⭐", label: "Points leader", description: `#${pointsRank + 1} for clan points.` });

  if (profile.verified) badges.push({ id: "verified", icon: "✅", label: "Verified", description: "RuneScape name linked to a Discord member." });

  return badges;
}
