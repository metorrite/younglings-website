import { ImageResponse } from "next/og";
import { throttle } from "@/lib/ratelimit";

/**
 * The welcome card: a 700x300 picture with a background (colour or picture), the new member's avatar and two lines of text. The bot
 * fetches it when someone joins (and draws a plainer one itself if this is unreachable); the dashboard shows it as the preview.
 * It is public and draws only what the address says, so the pictures it is willing to fetch are limited to Discord's CDN and this
 * site's own uploads (nothing else on the internet, or on a private network), and the texts are capped.
 */
const CARD_SIZE = { width: 700, height: 300 };

const HEX = /^[0-9a-f]{6}$/i;

function allowedPicture(raw: string | null, origin: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && !(url.origin === origin && url.protocol === "http:" && url.hostname === "localhost")) return null;
    if (url.hostname === "cdn.discordapp.com" || url.hostname === "media.discordapp.net") return url.toString();
    if (url.origin === origin && url.pathname.startsWith("/api/uploads/")) return url.toString();
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttle(`welcome-card:${forwarded}`, "publicRead")) return new Response("Slow down.", { status: 429 });

  const { searchParams, origin } = new URL(request.url);
  const title = (searchParams.get("title") ?? "").slice(0, 120);
  const description = (searchParams.get("description") ?? "").slice(0, 200);
  const bg = HEX.test(searchParams.get("bg") ?? "") ? `#${searchParams.get("bg")}` : "#1e2230";
  const color = HEX.test(searchParams.get("color") ?? "") ? `#${searchParams.get("color")}` : "#ffffff";
  const avatar = allowedPicture(searchParams.get("avatar"), origin);
  const image = allowedPicture(searchParams.get("image"), origin);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: bg, color, fontFamily: "sans-serif" }}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>
          <img src={image} alt="" width={700} height={300} style={{ position: "absolute", top: 0, left: 0, width: 700, height: 300, objectFit: "cover" }} />
        )}
        {image && <div style={{ position: "absolute", top: 0, left: 0, width: 700, height: 300, background: "rgba(0,0,0,0.35)" }} />}
        <div style={{ display: "flex", alignItems: "center", gap: 40, padding: "0 50px", width: "100%" }}>
          <div style={{ display: "flex", width: 170, height: 170, borderRadius: 85, border: "5px solid rgba(255,255,255,0.8)", background: "#5865f2", overflow: "hidden", flexShrink: 0 }}>
            {avatar && (
              // eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>
              <img src={avatar} alt="" width={160} height={160} style={{ width: 160, height: 160, objectFit: "cover" }} />
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 800, lineHeight: 1.15 }}>{title}</div>
            {description && <div style={{ display: "flex", fontSize: 24, lineHeight: 1.3, opacity: 0.9 }}>{description}</div>}
          </div>
        </div>
      </div>
    ),
    { ...CARD_SIZE, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
