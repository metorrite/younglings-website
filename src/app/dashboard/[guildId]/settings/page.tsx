import Link from "next/link";
import { ServerSetupForm } from "@/components/dashboard/ServerSetupForm";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveServerSetupAction } from "./actions";

const GUIDES = [
  { mode: "quick", title: "Quick setup", time: "About 3 minutes", blurb: "Easy yes or no questions and just the details each part needs." },
  { mode: "full", title: "Full setup", time: "About 10 minutes", blurb: "Every part with all its options, including your own permission groups." },
  { mode: "custom", title: "Custom setup", time: "You choose", blurb: "Pick the parts you want to set up now, then go through just those." },
];

export default async function SettingsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [setup, structure] = await Promise.all([adminApi.serverSetup(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Setup guide</h2>
          <p className="text-sm text-muted">A guided run through the parts of JonnyBot. It starts from what is already set here, so you can leave and pick it up again.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {GUIDES.map((guide) => (
            <Link key={guide.mode} href={`/dashboard/${guildId}/wizard?mode=${guide.mode}`} className="rounded-lg border border-surface-border bg-surface p-4 transition hover:border-gold">
              <p className="font-semibold text-gold">{guide.title}</p>
              <p className="text-xs text-muted">{guide.time}</p>
              <p className="mt-2 text-sm text-muted">{guide.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Server settings</h2>
          <p className="text-sm text-muted">The basics JonnyBot needs to work in this server. Nothing here is set up for you: a new server starts empty, so begin with your clan if you have one.</p>
        </div>
        <ServerSetupForm initial={setup} structure={structure} save={saveServerSetupAction.bind(null, guildId)} />
      </section>
    </div>
  );
}
