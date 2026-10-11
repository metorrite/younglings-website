import { AccountGateForm } from "@/components/dashboard/AccountGateForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildAccountGateAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewAccountsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [gate, structure] = await Promise.all([
    adminApi.accountGate(guild).then(dashboardData),
    adminApi.structure(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New accounts"
        description="Raids and spam mostly come from brand-new Discord accounts. Be told when one joins, or keep them out until they are old enough."
      />
      <AccountGateForm
        initial={gate}
        structure={structure}
        save={saveGuildAccountGateAction.bind(null, guildId)}
      />
    </div>
  );
}
