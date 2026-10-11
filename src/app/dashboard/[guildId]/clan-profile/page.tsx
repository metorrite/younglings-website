import { ClanProfileForm } from "@/components/dashboard/ClanProfileForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveClanProfileAction, verifyClanProfileAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ClanProfilePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [profile, listings] = await Promise.all([adminApi.clanProfile(guild).then(dashboardData), adminApi.clanListings(guild)]);
  const isOwner = listings.ok && listings.data.canEdit;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clan profile"
        description="How your clan appears to others: its name, who it recruits and where to apply. Nothing is shown outside your server until you choose to."
      />
      <ClanProfileForm
        initial={profile}
        moderationHref={isOwner ? `/dashboard/${guildId}/listings` : undefined}
        actions={{
          save: saveClanProfileAction.bind(null, guildId),
          verify: verifyClanProfileAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
