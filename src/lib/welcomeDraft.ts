import type { WelcomeDraft, WelcomeMessageType } from "@/lib/jonnybot-admin";

/**
 * Rebuilds the welcome draft the browser sent into exactly the shape the bot expects. Anything unexpected is dropped or
 * defaulted and every text is capped at a size well past Discord's own limits (the bot is what checks the real limits and
 * explains a refusal). Shared by the clan admin console and the bot dashboard, whose Server Actions both start with this.
 */

const text = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");
const flag = (v: unknown): boolean => v === true;
const idOrNull = (v: unknown): string | null => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : null);
const TYPES: WelcomeMessageType[] = ["MESSAGE", "EMBED", "EMBED_TEXT"];

export function welcomeDraftFrom(input: unknown): WelcomeDraft | null {
  if (typeof input !== "object" || input === null) return null;
  const s = input as Record<string, unknown>;
  const type = TYPES.find((t) => t === s.messageType) ?? "EMBED_TEXT";
  const color = typeof s.color === "number" && Number.isInteger(s.color) && s.color >= 0 && s.color <= 0xffffff ? s.color : null;
  const fields = (Array.isArray(s.fields) ? s.fields : []).slice(0, 40).map((raw) => {
    const f = (raw ?? {}) as Record<string, unknown>;
    return { name: text(f.name, 300), value: text(f.value, 1200), inline: flag(f.inline) };
  });

  return {
    enabled: flag(s.enabled),
    messageType: type,
    channelId: idOrNull(s.channelId),
    alsoDm: flag(s.alsoDm),
    content: text(s.content, 2500),
    color,
    title: text(s.title, 400),
    titleUrl: text(s.titleUrl, 2100),
    description: text(s.description, 4500),
    authorName: text(s.authorName, 400),
    authorIconUrl: text(s.authorIconUrl, 2100),
    thumbnailUrl: text(s.thumbnailUrl, 2100),
    imageUrl: text(s.imageUrl, 2100),
    footerText: text(s.footerText, 2200),
    footerIconUrl: text(s.footerIconUrl, 2100),
    fields,
    linkButton: flag(s.linkButton),
    linkButtonLabel: text(s.linkButtonLabel, 120),
  };
}
