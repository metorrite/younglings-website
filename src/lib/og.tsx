import { ImageResponse } from "next/og";
import type { ReactNode } from "react";

/** Shared 1200×630 card used for link previews (Discord, social). Satori only understands flexbox and inline styles. */
export const OG_SIZE = { width: 1200, height: 630 };

export function ogCard(title: string, subtitle: string, stats: { label: string; value: string }[], accent = "#d4af37", extra?: ReactNode) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: `radial-gradient(circle at 15% 0%, ${accent}33, #0a0c10 55%)`,
          color: "#e5e7eb",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, letterSpacing: 6, color: "#9ca3af" }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: accent }} />
          YOUNGLINGS
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 88, fontWeight: 800, color: accent, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 34, color: "#cbd5e1" }}>{subtitle}</div>
          {extra}
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", padding: "18px 28px", borderRadius: 16, border: "2px solid #232838", background: "#12151c", minWidth: 200 }}>
              <div style={{ fontSize: 22, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2 }}>{s.label}</div>
              <div style={{ fontSize: 48, fontWeight: 700, color: "#f3f4f6" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
