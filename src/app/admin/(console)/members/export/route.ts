import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";

export const dynamic = "force-dynamic";

/** A spreadsheet-friendly copy of the roster table. Admin-only: it carries Discord names next to RuneScape names. */
const cell = (value: string | number | boolean | null) => {
  const text = value === null ? "" : String(value);
  // A leading = + - @ would be run as a formula by spreadsheet apps, so it is defused with a quote.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET() {
  const admin = await requireAdmin("/admin/members");
  const roster = unwrap(await adminApi.roster(admin));

  const header = ["RSN", "Rank", "Points", "Promotion due", "Verified", "Discord name", "Discord ID", "Verified on", "Joined", "Total level", "Combat level", "Total XP", "Boss kills", "Last refreshed", "Next refresh (est.)", "Last activity", "Visited Citadel this week", "Capped this week", "Notes"];
  const lines = [header.map(cell).join(",")];
  for (const m of roster.members) {
    lines.push(
      [m.rsn, m.rank, m.points, m.promotionNeeded, m.verified, m.discordName, m.discordId, m.verifiedAt?.slice(0, 10) ?? null, m.joinedAt ?? m.firstSeen?.slice(0, 10) ?? null, m.totalLevel, m.combatLevel, m.totalXp, m.kills, m.lastPolled, m.nextPoll, m.lastActivity, m.visitedThisWeek, m.cappedThisWeek, m.notes]
        .map(cell)
        .join(","),
    );
  }

  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="younglings-roster-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
