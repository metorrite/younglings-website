import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { PluginPointsForm } from "@/components/dashboard/PluginPointsForm";
import { savePluginPointsAction } from "./pointsActions";

export const dynamic = "force-dynamic";

function Bar({ value, of }: { value: number; of: number }) {
  const pct = of > 0 ? Math.min(100, Math.round((value / of) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${pct}%`}>
        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 text-right text-xs text-muted tabular-nums">
        {value} of {of}
      </span>
    </div>
  );
}

export default async function PluginCoveragePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [c, pluginPoints] = await Promise.all([adminApi.pluginCoverage(guild).then(dashboardData), adminApi.pluginPoints(guild)]);
  const savePoints = savePluginPointsAction.bind(null, guildId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clan plugin"
        description="How many of your members use the JonnyBot clan plugin. You only ever see counts: nobody is named, and no member is expected to install anything."
      />
      <PanelGrid min="26rem">
      <section className="rounded-xl border border-surface-border bg-surface p-5">
        <h2 className="font-semibold text-gold">Coverage</h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1 text-sm">Members with a RuneScape name linked in this server</p>
            <Bar value={c.linkedPlayers} of={c.rosterSize} />
          </div>
          <div>
            <p className="mb-1 text-sm">…who have connected the plugin</p>
            <Bar value={c.withToken} of={c.linkedPlayers} />
          </div>
          <div>
            <p className="mb-1 text-sm">…and reported something in the last {c.recentDays} days</p>
            <Bar value={c.reportingRecently} of={c.linkedPlayers} />
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-surface-border bg-surface p-5">
        <h2 className="font-semibold text-gold">What members allow</h2>
        <p className="mt-1 text-xs text-muted">Each member chooses these for themselves. Everything is off until they switch it on.</p>
        <div className="mt-4 space-y-4">
          {c.consent.map((k) => (
            <div key={k.key}>
              <p className="mb-1 text-sm">{k.label}</p>
              <Bar value={k.players} of={c.linkedPlayers} />
            </div>
          ))}
        </div>
      </section>
      </PanelGrid>
      <section className="rounded-xl border border-surface-border bg-surface p-5">
        <h2 className="font-semibold text-gold">Points for plugin reports</h2>
        <p className="mt-1 text-xs text-muted">
          Clan points a member earns here for what RuneSync reports from their game. Bingo and scavenger tiles also tick themselves for clues (&ldquo;Elite clue&rdquo;,
          &ldquo;Any clue&rdquo;), levels (&ldquo;99 Fletching&rdquo;), &ldquo;Collection log: item&rdquo;, &ldquo;Quest: name&rdquo; and &ldquo;Achievement: name&rdquo;, as well as drops and boss kills.
        </p>
        <div className="mt-4">
          {pluginPoints.ok ? (
            <PluginPointsForm initial={pluginPoints.data} save={savePoints} />
          ) : (
            <p className="text-sm text-red-300">These settings couldn&apos;t be loaded: {pluginPoints.error}</p>
          )}
        </div>
      </section>
      <p className="text-sm text-muted">
        Members connect the plugin from the Plugin tab of their JonnyBot profile. Until the plugin is released these numbers will be zero; they only change as people try it.
      </p>
    </div>
  );
}
