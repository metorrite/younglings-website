import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/shell/Sidebar";
import { NoticeBanners } from "@/components/dashboard/overview/NoticeBanners";
import { requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { switchOpen } from "@/lib/siteSwitches";

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", DEVELOPER: "Developer" };

/**
 * One server's dashboard: its navigation as a column down the left edge of the screen and the page filling the rest. Like every
 * dashboard page it is checked for *this* server before anything is shown.
 */
export default async function GuildLayout({ children, params }: { children: ReactNode; params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  // A failed lookup just means no banners: the dashboard works without them.
  const [notices, setup, favorites, view] = await Promise.all([adminApi.notices(guild), adminApi.serverSetup(guild), adminApi.favorites(guild), adminApi.viewMode(guild)]);
  const open = await switchOpen("dashboard");

  return (
    <div className="flex min-h-[calc(100vh-4.1rem)] flex-col lg:flex-row">
      <Sidebar
        server={{ id: guildId, name: guild.guildName, iconUrl: guild.guildIconUrl, role: ROLE_LABEL[guild.tier] ?? "Manager" }}
        hasClan={!setup.ok || setup.data.clanActive}
        favorites={favorites.ok ? favorites.data.paths : []}
        savedView={view.ok ? view.data.mode : undefined}
        footer={`JonnyBot dashboard · ${open ? "Beta" : "Beta, clan admins only"}. Signed in as ${guild.displayName}.`}
      />
      <div className="min-w-0 flex-1 space-y-6 px-4 py-6 sm:px-8 lg:px-10">
        {notices.ok && <NoticeBanners notices={notices.data.notices} />}
        {children}
      </div>
    </div>
  );
}
