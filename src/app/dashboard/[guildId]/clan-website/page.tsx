import { notFound } from "next/navigation";
import { ClanWebsiteEditor } from "@/components/dashboard/ClanWebsiteEditor";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { clanSitesOn } from "@/lib/clanSites";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { publishClanSiteAction, saveClanSiteAction, saveClanSiteBlocksAction, takedownClanSiteAction } from "./actions";

export const dynamic = "force-dynamic";

/** The clan's own website (website builder): switch it on, pick a look, choose pages, write blocks, preview, publish. Beta, behind CLAN_SITES. */
export default async function ClanWebsitePage({ params }: { params: Promise<{ guildId: string }> }) {
  if (!clanSitesOn()) notFound();
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [site, profile] = await Promise.all([adminApi.clanSite(guild).then(dashboardData), adminApi.clanProfile(guild).then(dashboardData)]);
  const suffix = process.env.SITE_TENANT_SUFFIX?.trim().replace(/^\./, "") ?? "";
  const siteUrl = site.slug && suffix ? `https://${site.slug}.${suffix}/` : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clan website"
        description="Your clan's own website, filled from JonnyBot's data: pick a look, choose the pages, write your own text, and publish it at your clan's address. Beta."
      />
      <ClanWebsiteEditor
        initial={site}
        clan={{ name: profile.displayName || profile.suggestedName, tagline: profile.tagline, description: profile.description, logoUrl: profile.logoUrl }}
        siteUrl={siteUrl}
        downloadHref={`/dashboard/${guildId}/clan-website/download`}
        profileHref={`/dashboard/${guildId}/clan-profile`}
        actions={{
          save: saveClanSiteAction.bind(null, guildId),
          saveBlocks: saveClanSiteBlocksAction.bind(null, guildId),
          publish: publishClanSiteAction.bind(null, guildId),
          takedown: takedownClanSiteAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
