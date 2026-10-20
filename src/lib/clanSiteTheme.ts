/**
 * The website builder's rules for a clan site's look and pages (docs/DOMAINS-AND-SITE-BUILDER.md B2, B3). Pure, so the dashboard's editor
 * (T-067), the bot-facing checks and the tests share one source. A clan picks: one of three templates, a primary and an accent colour from a
 * checked palette, a logo and a banner (https images), one of three fonts, which pages show and in what order, and the titles of up to three
 * custom pages. No custom code or CSS.
 */

export type SiteTemplate = "CLASSIC" | "HALL" | "MINIMAL";
export const TEMPLATES: { key: SiteTemplate; label: string; hint: string }[] = [
  { key: "CLASSIC", label: "Classic", hint: "Dark, gold accents: the look of the Younglings site." },
  { key: "HALL", label: "Hall", hint: "Dark stone and warm light, like a RuneScape guild hall." },
  { key: "MINIMAL", label: "Minimal", hint: "Light and plain, text first." },
];

/** Colours a clan may pick, each checked to read well as a button and a link on all three templates. */
export const PALETTE: { key: string; label: string; hex: string }[] = [
  { key: "gold", label: "Gold", hex: "#c9a227" },
  { key: "crimson", label: "Crimson", hex: "#c0392b" },
  { key: "emerald", label: "Emerald", hex: "#1f9d63" },
  { key: "azure", label: "Azure", hex: "#2f7fd1" },
  { key: "violet", label: "Violet", hex: "#7c5cd6" },
  { key: "teal", label: "Teal", hex: "#13998b" },
  { key: "orange", label: "Orange", hex: "#d9731a" },
  { key: "slate", label: "Slate", hex: "#5b6b82" },
];

export type SiteFont = "sans" | "serif" | "mono";
export const FONTS: { key: SiteFont; label: string; stack: string }[] = [
  { key: "sans", label: "Clean", stack: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif" },
  { key: "serif", label: "Classic serif", stack: "Georgia, 'Times New Roman', ui-serif, serif" },
  { key: "mono", label: "Typewriter", stack: "var(--font-geist-mono), ui-monospace, monospace" },
];

export interface SiteTheme {
  primary: string;
  accent: string;
  font: SiteFont;
  logoUrl: string | null;
  bannerUrl: string | null;
}

/** The page every site has, the pages a clan can switch off, and the three custom ones. */
export type PageKey = "home" | "roster" | "stats" | "events" | "recaps" | "apply" | "about" | "custom1" | "custom2" | "custom3";
export const PAGES: { key: PageKey; label: string; path: string; custom?: boolean }[] = [
  { key: "home", label: "Home", path: "" },
  { key: "roster", label: "Roster", path: "/roster" },
  { key: "stats", label: "Stats", path: "/stats" },
  { key: "events", label: "Events", path: "/events" },
  { key: "recaps", label: "Recaps", path: "/recaps" },
  { key: "apply", label: "Apply", path: "/apply" },
  { key: "about", label: "About", path: "/about" },
  { key: "custom1", label: "Page 1", path: "/p/1", custom: true },
  { key: "custom2", label: "Page 2", path: "/p/2", custom: true },
  { key: "custom3", label: "Page 3", path: "/p/3", custom: true },
];

export interface SitePage {
  key: PageKey;
  enabled: boolean;
  /** The title in the menu and on the page (the clan's own for custom pages; the standard label otherwise). */
  title: string;
  path: string;
  /** Roster only: show when each member joined. */
  showJoined?: boolean;
}

const DEFAULTS: Record<SiteTemplate, { primary: string; accent: string; font: SiteFont }> = {
  CLASSIC: { primary: "gold", accent: "slate", font: "sans" },
  HALL: { primary: "orange", accent: "gold", font: "serif" },
  MINIMAL: { primary: "azure", accent: "slate", font: "sans" },
};

const MAX_TITLE = 30;

const hexOf = (key: unknown): string | null => PALETTE.find((c) => c.key === key)?.hex ?? null;

/** Only an https image address is used (no data:, no javascript:, no http). */
export function safeImageUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 500) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseTemplate(raw: unknown): SiteTemplate {
  return raw === "HALL" || raw === "MINIMAL" ? raw : "CLASSIC";
}

/** A saved theme made safe: unknown colours and fonts fall back to the template's own, unsafe images are dropped. */
export function parseTheme(raw: unknown, template: SiteTemplate): SiteTheme {
  const t = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const d = DEFAULTS[template];
  return {
    primary: hexOf(t.primary) ?? hexOf(d.primary)!,
    accent: hexOf(t.accent) ?? hexOf(d.accent)!,
    font: FONTS.some((f) => f.key === t.font) ? (t.font as SiteFont) : d.font,
    logoUrl: safeImageUrl(t.logoUrl),
    bannerUrl: safeImageUrl(t.bannerUrl),
  };
}

const cleanTitle = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const t = raw.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE);
  return t || null;
};

/**
 * The saved page list made whole: every page once, in the clan's order (pages it didn't mention follow in the standard order), Home first
 * and always on. Custom pages are off until given a title. With nothing saved: every standard page on, custom pages off.
 */
export function parsePages(raw: unknown): SitePage[] {
  const saved = Array.isArray(raw) ? raw : [];
  const seen = new Set<PageKey>();
  const out: SitePage[] = [];
  const add = (key: PageKey, entry: Record<string, unknown> | null) => {
    if (seen.has(key)) return;
    seen.add(key);
    const def = PAGES.find((p) => p.key === key)!;
    const title = def.custom ? cleanTitle(entry?.title) : cleanTitle(entry?.title) ?? def.label;
    const enabled = key === "home" ? true : def.custom ? Boolean(title) && entry?.enabled !== false : entry ? entry.enabled !== false : true;
    const page: SitePage = { key, enabled, title: title ?? def.label, path: def.path };
    if (key === "roster") page.showJoined = entry?.showJoined === true;
    out.push(page);
  };
  const entries = saved.filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === "object");
  add("home", entries.find((e) => e.key === "home") ?? null);
  for (const e of entries) if (PAGES.some((p) => p.key === e.key)) add(e.key as PageKey, e);
  for (const p of PAGES) add(p.key, null);
  return out;
}

/** The CSS variables a template sets for one site; the template components only read these. */
export function cssVariables(template: SiteTemplate, theme: SiteTheme): Record<string, string> {
  const font = FONTS.find((f) => f.key === theme.font)!.stack;
  const base =
    template === "MINIMAL"
      ? { bg: "#fafafa", surface: "#ffffff", text: "#1c1c1f", muted: "#5f6368", border: "#e3e3e6" }
      : template === "HALL"
        ? { bg: "#16130f", surface: "#221d17", text: "#efe6d6", muted: "#b3a68f", border: "#3a3127" }
        : { bg: "#0b0b0d", surface: "#141418", text: "#ededed", muted: "#a1a1aa", border: "#26262c" };
  return {
    "--cs-bg": base.bg,
    "--cs-surface": base.surface,
    "--cs-text": base.text,
    "--cs-muted": base.muted,
    "--cs-border": base.border,
    "--cs-primary": theme.primary,
    "--cs-accent": theme.accent,
    "--cs-font": font,
  };
}
