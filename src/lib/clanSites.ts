import { botCall } from "@/lib/botCall";
import type { ClanDetail } from "@/lib/clansHub";
import { demoClan } from "@/lib/clansHubDemo";

/**
 * Clan websites from the website builder (docs/DOMAINS-AND-SITE-BUILDER.md part B): a clan's own site at `<slug>.<SITE_TENANT_SUFFIX>`.
 * Off unless `CLAN_SITES=true` and a tenant suffix is set; the bot only answers for a site that is published and whose server is in the beta.
 */
export const clanSitesOn = (): boolean => process.env.CLAN_SITES === "true" && Boolean(process.env.SITE_TENANT_SUFFIX?.trim());

export type SiteTemplate = "CLASSIC" | "HALL" | "MINIMAL";

export interface TenantSite {
  slug: string;
  clan: ClanDetail;
  template: SiteTemplate;
  /** Colours, logo, banner and font, as the clan saved them (checked by the bot's admin routes); read through the template's theme code. */
  theme: Record<string, unknown>;
  /** Which pages show and in what order. */
  pages: unknown[];
  publishedAt: string | null;
}

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const demoOn = () => process.env.HUB_DEMO === "true";

/** The published site for a slug: the site, `undefined` when there is none (unknown, unpublished, not in the beta), `null` when the bot can't be asked. */
export async function getTenantSite(slug: string): Promise<TenantSite | null | undefined> {
  if (!SLUG.test(slug)) return undefined;
  if (demoOn()) {
    const clan = demoClan(slug);
    return clan ? { slug, clan, template: "CLASSIC", theme: {}, pages: [], publishedAt: null } : clan;
  }
  // Five minutes, and the bot purges the `hub:sites` tag the moment a site or its clan profile changes.
  const answer = await botCall<TenantSite>(`/internal/directory/sites/${slug}`, { revalidate: 300 });
  if (!answer) return null;
  if (answer.status === 404) return undefined;
  return answer.status === 200 ? answer.json : null;
}
