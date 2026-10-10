import Link from "next/link";
import type { ReactNode } from "react";
import { GuildTabs } from "@/components/dashboard/GuildTabs";
import { requireGuild } from "@/lib/dashboard";

/** One server's dashboard. Like every dashboard page it is checked for *this* server before anything is shown. */
export default async function GuildLayout({ children, params }: { children: ReactNode; params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          ← All servers
        </Link>
        <div className="flex items-center gap-3">
          {guild.guildIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a server icon from Discord's CDN
            <img src={`${guild.guildIconUrl}?size=96`} alt="" width={40} height={40} className="h-10 w-10 rounded-full" />
          ) : (
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-semibold text-muted">
              {guild.guildName.charAt(0).toUpperCase()}
            </span>
          )}
          <h1 className="text-2xl font-semibold">{guild.guildName}</h1>
        </div>
        <GuildTabs guildId={guildId} />
      </div>
      {children}
    </div>
  );
}
