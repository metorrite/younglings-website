import { notFound } from "next/navigation";
import { SnapshotsManager } from "@/components/dashboard/SnapshotsManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { deleteSnapshotAction, takeSnapshotAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Dev snapshots: the bot's state at one moment, bundled into a zip with an id for a bug report. For the bot's owner only; to anyone else the bot
 * answers 403 and this page is a plain 404, so it doesn't announce itself.
 */
export default async function SnapshotsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const result = await adminApi.devSnapshots(guild);
  if (!result.ok && result.status === 403) notFound();
  const list = dashboardData(result);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Snapshots"
        description="Bundles the bot's state at this moment (settings, polling, recent errors and the rows of one event, ticket or member) into a zip with an id. Put the id in a bug report. Secrets are removed."
      />
      <SnapshotsManager
        guildId={guildId}
        initial={list.snapshots}
        keepDays={list.keepDays}
        take={takeSnapshotAction.bind(null, guildId)}
        remove={deleteSnapshotAction.bind(null, guildId)}
      />
    </div>
  );
}
