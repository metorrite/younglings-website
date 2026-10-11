import { SuggestionsManager } from "@/components/dashboard/SuggestionsManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import {
  decideSuggestionAction,
  deleteSuggestionAction,
  saveSuggestionChannelAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function SuggestionsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [list, structure] = await Promise.all([
    adminApi.suggestions(guild).then(dashboardData),
    adminApi.structure(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suggestions"
        description="Members post ideas with /suggest and everyone votes. Reply to them here: approve, deny or mark them implemented."
      />
      <SuggestionsManager
        initial={list}
        structure={structure}
        actions={{
          saveChannel: saveSuggestionChannelAction.bind(null, guildId),
          decide: decideSuggestionAction.bind(null, guildId),
          remove: deleteSuggestionAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
