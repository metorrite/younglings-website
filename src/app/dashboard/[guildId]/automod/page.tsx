import { AutomodForm } from "@/components/dashboard/AutomodForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveAutomodAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AutomodPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [automod, structure] = await Promise.all([adminApi.automod(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automod"
        description="Deletes messages that break the rules you switch on, and can give the writer a warning that counts toward Autopunish. Moderators, bots and anyone you exempt are never checked."
      />
      <AutomodForm initial={automod} structure={structure} save={saveAutomodAction.bind(null, guildId)} />
    </div>
  );
}
