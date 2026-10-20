import { HighlightsForm } from "@/components/dashboard/HighlightsForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildHighlightsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function HighlightsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [highlights, structure] = await Promise.all([adminApi.highlights(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Highlights" description="Members pick words and get a direct message when someone says one in a channel they can see. Off until you switch it on." />
      <HighlightsForm initial={highlights} structure={structure} save={saveGuildHighlightsAction.bind(null, guildId)} />
    </div>
  );
}
