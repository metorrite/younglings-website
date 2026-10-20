import { LookupRemindersForm } from "@/components/dashboard/LookupRemindersForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveLookupRemindersAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function RsTimersPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [settings, structure] = await Promise.all([adminApi.lookups(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="RuneScape timers"
        description="Optional reminders for RuneScape 3 timers. The lookup commands themselves (/price, /worldevents and the other RuneScape ones) are switched on and off on the Commands page."
      />
      <LookupRemindersForm initial={settings} structure={structure} save={saveLookupRemindersAction.bind(null, guildId)} />
    </div>
  );
}
