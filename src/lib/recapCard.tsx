import { ImageResponse } from "next/og";
import { ACCENTS } from "@/lib/recap";
import { compact, full, shortDay, type Recap } from "@/lib/site";

/** The finished recap card — the same picture the web page shows on its last slide and the Discord bot posts. Satori draws it: flexbox and inline styles only. */
export const CARD_SIZE = { width: 1080, height: 1350 };

const MUTED = "#9ca3af";

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "26px 30px", borderRadius: 28, border: "2px solid #232838", background: "#12151c", gap: 6 }}>
      <div style={{ display: "flex", fontSize: 24, color: MUTED, textTransform: "uppercase", letterSpacing: 3 }}>{label}</div>
      <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: "#f3f4f6", lineHeight: 1.1 }}>{value}</div>
      <div style={{ display: "flex", fontSize: 24, color: MUTED, minHeight: 30 }}>{sub ?? ""}</div>
    </div>
  );
}

export function recapCard(recap: Recap): ImageResponse {
  const accent = ACCENTS.gold;
  const clan = recap.scope === "clan";
  const act = recap.activity.hidden ? null : recap.activity;
  const host = (process.env.NEXTAUTH_URL ?? "younglings").replace(/^https?:\/\//, "").replace(/\/$/, "");

  const best = recap.xp.bestDay;
  const capWeeks = clan ? recap.citadel.capWeeks ?? 0 : recap.citadel.weeksCapped ?? 0;
  const rank = recap.ranking;

  const tiles: { label: string; value: string; sub?: string }[] = [
    clan
      ? { label: "Active members", value: String(recap.activeMembers ?? 0), sub: `of ${recap.subject.memberCount ?? "—"}` }
      : rank?.inRankings && rank.rank
        ? { label: "Clan rank", value: `#${rank.rank}`, sub: `of ${rank.outOf}${rank.topPercent ? ` · top ${rank.topPercent}%` : ""}` }
        : { label: "Total level", value: String(recap.subject.totalLevel ?? "—"), sub: recap.subject.rank },
    { label: "Best day", value: best ? compact(best.xp) : "—", sub: best ? shortDay(best.date) : undefined },
    { label: "Boss kills", value: act ? full(act.bossKills) : "private", sub: act?.topBosses[0]?.boss },
    { label: "Citadel caps", value: String(capWeeks), sub: clan ? "member-weeks" : `${recap.citadel.longestStreak ?? 0}-week best streak` },
  ];

  const skills = recap.skills.slice(0, 3);
  const maxSkill = Math.max(1, ...skills.map((s) => s.xp));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `radial-gradient(circle at 12% 0%, ${accent}44, #0a0c10 58%)`,
          color: "#e5e7eb",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 28, letterSpacing: 6, color: MUTED }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: accent }} />
            YOUNGLINGS
          </div>
          <div style={{ display: "flex", letterSpacing: 2, color: "#cbd5e1" }}>{recap.period.label}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", fontSize: 30, color: MUTED, textTransform: "uppercase", letterSpacing: 6 }}>{clan ? "Clan recap" : `${recap.subject.rank ?? "Member"} recap`}</div>
          <div style={{ display: "flex", fontSize: recap.subject.name.length > 14 ? 78 : 104, fontWeight: 800, color: accent, lineHeight: 1.05 }}>{recap.subject.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, color: MUTED, textTransform: "uppercase", letterSpacing: 5 }}>XP gained</div>
          <div style={{ display: "flex", fontSize: 210, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>{compact(recap.xp.total)}</div>
          <div style={{ display: "flex", fontSize: 30, color: "#cbd5e1" }}>about {compact(recap.xp.perDay)} a day{recap.xp.busiestWeekday ? ` · busiest on ${recap.xp.busiestWeekday}s` : ""}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", gap: 20 }}>
            <Tile {...tiles[0]} />
            <Tile {...tiles[1]} />
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <Tile {...tiles[2]} />
            <Tile {...tiles[3]} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {skills.map((s) => (
            <div key={s.skillId} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ display: "flex", width: 210, fontSize: 28, color: "#e5e7eb" }}>{s.skill}</div>
              <div style={{ display: "flex", flex: 1, height: 22, borderRadius: 11, background: "#1b2030" }}>
                <div style={{ display: "flex", width: `${Math.max(4, (s.xp / maxSkill) * 100)}%`, height: 22, borderRadius: 11, background: accent }} />
              </div>
              <div style={{ display: "flex", width: 130, justifyContent: "flex-end", fontSize: 28, color: "#cbd5e1" }}>{compact(s.xp)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: MUTED }}>
          <div style={{ display: "flex" }}>{host}</div>
          <div style={{ display: "flex" }}>{clan ? "Every member counts" : "Keep grinding"}</div>
        </div>
      </div>
    ),
    {
      ...CARD_SIZE,
      headers: {
        // A running period changes as the bot polls, a finished one never does.
        "Cache-Control": recap.period.toDate ? "public, max-age=300, s-maxage=300" : "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}
