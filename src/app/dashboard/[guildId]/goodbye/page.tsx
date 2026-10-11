import { GoodbyeForm } from "@/components/dashboard/GoodbyeForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildGoodbyeAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function GoodbyePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [goodbye, structure] = await Promise.all([adminApi.goodbye(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Goodbye message" description="A line posted in a channel when someone leaves the server." />
      <GoodbyeForm initial={goodbye} structure={structure} save={saveGuildGoodbyeAction.bind(null, guildId)} />
    </div>
  );
}
