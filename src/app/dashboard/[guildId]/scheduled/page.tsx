import { ScheduledPosts } from "@/components/admin/ScheduledPosts";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi, choicesOf } from "@/lib/jonnybot-admin";
import { cancelGuildScheduledAction, scheduleGuildPostAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ScheduledPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [structure, scheduled] = await Promise.all([adminApi.structure(guild).then(dashboardData), adminApi.scheduled(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Scheduled posts" description="Write an announcement now and have JonnyBot post it later." />
      <ScheduledPosts
        initial={scheduled.posts}
        {...choicesOf(structure)}
        actions={{ schedule: scheduleGuildPostAction.bind(null, guildId), cancel: cancelGuildScheduledAction.bind(null, guildId) }}
      />
    </div>
  );
}
