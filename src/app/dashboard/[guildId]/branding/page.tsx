import { BrandingForm } from "@/components/dashboard/BrandingForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildBrandingAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function BrandingPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const branding = await adminApi.branding(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader title="Bot appearance" description="What JonnyBot calls your server in its messages, and the name it goes by here." />
      <BrandingForm initial={branding} save={saveGuildBrandingAction.bind(null, guildId)} />
    </div>
  );
}
