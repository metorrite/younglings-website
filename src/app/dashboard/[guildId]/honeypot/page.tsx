import { HoneypotForm } from "@/components/dashboard/HoneypotForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveHoneypotAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function HoneypotPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [honeypot, structure] = await Promise.all([adminApi.honeypot(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Honeypot"
        description="A decoy channel or role that no real member should touch. Raid bots post in every channel and take every role they can, so whoever does is timed out, kicked or banned."
      />
      <HoneypotForm initial={honeypot} structure={structure} save={saveHoneypotAction.bind(null, guildId)} />
    </div>
  );
}
