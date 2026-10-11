import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/shell/Sidebar";
import { NoticeBanners } from "@/components/dashboard/overview/NoticeBanners";
import { requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", DEVELOPER: "Developer" };

/**
 * One server's dashboard: its navigation down the left and the page beside it. Like every dashboard page it is checked for *this*
 * server before anything is shown.
 */
export default async function GuildLayout({ children, params }: { children: ReactNode; params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  // A failed lookup just means no banners: the dashboard works without them.
  const notices = await adminApi.notices(guild);

  return (
    <div className="gap-8 space-y-4 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:space-y-0">
      <Sidebar server={{ id: guildId, name: guild.guildName, iconUrl: guild.guildIconUrl, role: ROLE_LABEL[guild.tier] ?? "Manager" }} />
      <div className="min-w-0 space-y-6">
        {notices.ok && <NoticeBanners notices={notices.data.notices} />}
        {children}
      </div>
    </div>
  );
}
