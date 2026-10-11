import { StarboardForm } from "@/components/dashboard/StarboardForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildStarboardAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function StarboardPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [starboard, structure] = await Promise.all([adminApi.starboard(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Starboard" description="A showcase channel for the best messages: when one collects enough of a reaction, it is copied there." />
      <StarboardForm initial={starboard} structure={structure} save={saveGuildStarboardAction.bind(null, guildId)} />
    </div>
  );
}
