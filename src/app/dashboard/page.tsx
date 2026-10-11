import Link from "next/link";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, installUrl, requireDashboardUser } from "@/lib/dashboard";
import { dashboardApi, type ManagedGuild } from "@/lib/jonnybot-admin";

function GuildIcon({ guild }: { guild: ManagedGuild }) {
  if (!guild.iconUrl) {
    return (
      <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-semibold text-muted">
        {guild.name.charAt(0).toUpperCase()}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- a server icon from Discord's CDN
  return <img src={`${guild.iconUrl}?size=128`} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full" />;
}

export default async function DashboardHome() {
  const user = await requireDashboardUser();
  const { guilds } = dashboardData(await dashboardApi.guilds(user.id));
  const install = installUrl();

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-8">
      <PageHeader title="Your servers" description="The servers you can manage that already have JonnyBot. Pick one to change how the bot works there." />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {guilds.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {guilds.map((guild) => (
              <li key={guild.id}>
                <Link href={`/dashboard/${guild.id}`} className="group flex items-center gap-4 rounded-xl border border-surface-border bg-surface p-5 transition hover:border-gold/60 hover:bg-gold/5">
                  <GuildIcon guild={guild} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{guild.name}</span>
                    <span className="block text-xs text-muted">{guild.memberCount.toLocaleString("en-GB")} members</span>
                  </span>
                  <span aria-hidden="true" className="text-muted transition group-hover:translate-x-0.5 group-hover:text-gold">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-surface-border p-10 text-center">
            <p className="font-medium">No servers yet</p>
            <p className="mt-1 text-sm text-muted">Either JonnyBot isn&apos;t in a server you manage, or you don&apos;t have Manage Server there. Add it from the panel, then come back.</p>
          </div>
        )}

        <section className="rounded-xl border border-surface-border bg-surface p-6">
          <h2 className="font-semibold text-gold">Add JonnyBot to a server</h2>
          <p className="mt-1 text-sm text-muted">
            Discord asks which server to add it to, and you need Manage Server there. Once it&apos;s in, the server appears here and starts with nothing set up, so you choose what it does.
          </p>
          {install ? (
            <a href={install} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-md bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4752c4]">
              Add to a server
            </a>
          ) : (
            <p className="mt-4 text-sm text-amber-300">The bot&apos;s Discord application id isn&apos;t configured on this site yet (DISCORD_BOT_CLIENT_ID), so there is no install link.</p>
          )}
        </section>
      </div>
    </div>
  );
}
