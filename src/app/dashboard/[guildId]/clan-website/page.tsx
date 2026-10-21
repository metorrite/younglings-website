import { ClanWebsiteForm } from "@/components/admin/SiteSettingsForms";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildClanWebsiteAction } from "../bot-pages-actions";

export const metadata = { title: "Clan website — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function ClanWebsitePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const { websiteUrl } = await adminApi.clanWebsite(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader title="Clan website" description="Where the clan name in Discord links to. The same setting as Clan Setup in /configure." />
      <ClanWebsiteForm initial={websiteUrl} save={saveGuildClanWebsiteAction.bind(null, guildId)} />
    </div>
  );
}
