import { botCall } from "@/lib/botCall";
import { clanEvents, type ClanDetail, type HubEvent } from "@/lib/clansHub";
import { demoClan, demoClans } from "@/lib/clansHubDemo";
import type { SiteTemplate } from "@/lib/clanSiteTheme";
import type { Overview, Recap, RosterData } from "@/lib/site";

/**
 * Clan websites from the website builder (docs/DOMAINS-AND-SITE-BUILDER.md part B): a clan's own site at `<slug>.<SITE_TENANT_SUFFIX>`.
 * Off unless `CLAN_SITES=true` and a tenant suffix is set; the bot only answers for a site that is published and whose server is in the beta.
 */
export const clanSitesOn = (): boolean => process.env.CLAN_SITES === "true" && Boolean(process.env.SITE_TENANT_SUFFIX?.trim());

export type { SiteTemplate };

export interface SiteBlock {
  page: string;
  position: number;
  kind: "TEXT" | "IMAGE" | "LINKS";
  /** TEXT: `{markdown}`; IMAGE: `{url, alt?, caption?}`; LINKS: `{links: [{label, url}]}`. Read through the block renderer, which checks it. */
  body: Record<string, unknown>;
}

export interface TenantSite {
  slug: string;
  clan: ClanDetail;
  template: SiteTemplate;
  /** Colours, logo, banner and font, as the clan saved them; read through `parseTheme`. */
  theme: Record<string, unknown>;
  /** Which pages show and in what order; read through `parsePages`. */
  pages: unknown[];
  blocks: SiteBlock[];
  publishedAt: string | null;
}

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const demoOn = () => process.env.HUB_DEMO === "true";

/** The published site for a slug: the site, `undefined` when there is none (unknown, unpublished, not in the beta), `null` when the bot can't be asked. */
export async function getTenantSite(slug: string): Promise<TenantSite | null | undefined> {
  if (!SLUG.test(slug)) return undefined;
  if (demoOn()) return demoSite(slug);
  // Five minutes, and the bot purges the `hub:sites` tag the moment a site or its clan profile changes.
  const answer = await botCall<TenantSite>(`/internal/directory/sites/${slug}`, { revalidate: 300 });
  if (!answer) return null;
  if (answer.status === 404) return undefined;
  return answer.status === 200 ? { ...answer.json, blocks: answer.json.blocks ?? [] } : null;
}

type DataRoute = { members: RosterData; overview: Overview; leaderboard: unknown; recap: Recap };

/** One of the site's clan-data reads (the same answers the Younglings site gets for its own clan), or null when it can't be had. */
export async function tenantData<K extends keyof DataRoute>(slug: string, route: K, query = ""): Promise<DataRoute[K] | null> {
  if (!SLUG.test(slug)) return null;
  if (demoOn()) return demoData(route) as DataRoute[K] | null;
  const answer = await botCall<DataRoute[K]>(`/internal/directory/sites/${slug}/data/${route}${query ? `?${query}` : ""}`, { revalidate: 300 });
  return answer && answer.status === 200 ? answer.json : null;
}

/** The clan's shared upcoming events (the hub's list for this clan). */
export async function tenantEvents(slug: string): Promise<HubEvent[]> {
  return clanEvents(slug);
}

// ---------- demo (HUB_DEMO=true): local work without the bot ----------

function demoSite(slug: string): TenantSite | undefined {
  const clan = demoClan(slug);
  if (!clan) return undefined;
  // The demo clans take turns with the three templates and some colours, so each look can be seen locally.
  const index = demoClans().findIndex((c) => c.slug === slug);
  const template = (["CLASSIC", "HALL", "MINIMAL"] as const)[index % 3];
  return {
    slug,
    clan,
    template,
    theme: { primary: ["gold", "orange", "azure"][index % 3], accent: "slate" },
    pages: [{ key: "home" }, { key: "custom1", title: "Clan rules" }],
    blocks: [
      { page: "home", position: 0, kind: "TEXT", body: { markdown: `## Welcome to ${clan.name}\nWe meet **every evening** on Discord.\n\n- Weekly bossing\n- Skilling competitions\n- A buddy for new members` } },
      { page: "custom1", position: 0, kind: "TEXT", body: { markdown: "1. Be kind\n2. No scamming\n3. Have fun" } },
      { page: "about", position: 0, kind: "LINKS", body: { links: [{ label: "Our Discord", url: "https://discord.com" }] } },
    ],
    publishedAt: null,
  };
}

function demoData(route: keyof DataRoute): unknown {
  const ranks = [
    { name: "Owner", order: 0, threshold: 0, count: 1 },
    { name: "General", order: 1, threshold: 0, count: 2 },
    { name: "Recruit", order: 2, threshold: 0, count: 3 },
  ];
  const names = ["Aldric", "Bryn", "Cassia", "Doran", "Elowen", "Fenn"];
  if (route === "members") {
    return {
      ranks,
      members: names.map((rsn, i) => ({
        rsn, rank: ranks[Math.min(2, Math.ceil(i / 2))].name, rankOrder: Math.min(2, Math.ceil(i / 2)), totalXp: 300_000_000 - i * 20_000_000, kills: 900 - i * 100,
        joined: `2025-0${i + 1}-15`, joinedExact: true, points: 0, promotionNeeded: false, verified: true, totalLevel: 2800 - i * 50, combatLevel: 138 - i,
      })),
    };
  }
  if (route === "overview") {
    return {
      clan: { name: "Demo", memberCount: names.length, verifiedCount: names.length, totalXp: 1_500_000_000, totalKills: 4200, averageTotalLevel: 2650, xpToday: 4_000_000, xpWeek: 61_000_000, xpMonth: 240_000_000 },
      ranks, gains: { day: [], week: names.slice(0, 3).map((rsn, i) => ({ rsn, xp: 9_000_000 - i * 2_000_000 })), month: [] },
      citadel: { weeks: [], topCappers: [] }, roster: [], skillLeaders: [], topXp: [], topKills: [], topLevel: [], topPoints: [],
    };
  }
  return null;
}
