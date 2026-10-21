import { notFound } from "next/navigation";
import { cache } from "react";
import { getTenantSite, type TenantSite } from "@/lib/clanSites";
import { parsePages, parseTemplate, parseTheme, type PageKey, type SitePage, type SiteTemplate, type SiteTheme } from "@/lib/clanSiteTheme";

export interface SiteContext {
  site: TenantSite;
  template: SiteTemplate;
  theme: SiteTheme;
  pages: SitePage[];
}

/** The site with its look and pages made safe. Asked once per request (the layout and the page both need it). */
export const siteContext = cache(async (slug: string): Promise<SiteContext | null | undefined> => {
  const site = await getTenantSite(slug);
  if (!site) return site;
  const template = parseTemplate(site.template);
  return { site, template, theme: parseTheme(site.theme, template), pages: parsePages(site.pages) };
});

/** For a page of a clan site: the site and that page, or the "not found" page when the site or the page (switched off) isn't there. */
export async function sitePage(slug: string, key: PageKey): Promise<SiteContext & { page: SitePage }> {
  const ctx = await siteContext(slug);
  if (!ctx) notFound();
  const page = ctx.pages.find((p) => p.key === key);
  if (!page?.enabled) notFound();
  return { ...ctx, page };
}
