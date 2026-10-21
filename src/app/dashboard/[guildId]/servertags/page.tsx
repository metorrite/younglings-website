import { ServerTagForm } from "@/components/dashboard/ServerTagForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveServerTagAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ServerTagsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [rule, structure] = await Promise.all([adminApi.serverTag(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Server tags"
        description="Members can show another server's tag on their Discord profile. Be told about, or act on, members who show the tag of a server you have flagged."
      />
      <ServerTagForm initial={rule} structure={structure} save={saveServerTagAction.bind(null, guildId)} />
    </div>
  );
}
