import { WarningsManager } from "@/components/dashboard/WarningsManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { deleteWarningAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function WarningsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const list = await adminApi.warnings(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warnings"
        description="The record of warnings given with /warn. Take one back if it was a mistake."
      />
      <WarningsManager
        initial={list}
        actions={{ remove: deleteWarningAction.bind(null, guildId) }}
      />
    </div>
  );
}
