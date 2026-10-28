import { CustomTagsEditor } from "@/components/dashboard/CustomTagsEditor";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { deleteGuildCustomTagAction, saveGuildCustomTagAction, setGuildCustomTagsEnabledAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CustomTagsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [tags, structure] = await Promise.all([adminApi.customTags(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Custom tags" description="Saved replies members bring up with /tag use, such as rules, guides or links. All of them live under the one /tag command. Off until you switch it on." />
      <CustomTagsEditor
        initial={tags}
        structure={structure}
        actions={{
          setEnabled: setGuildCustomTagsEnabledAction.bind(null, guildId),
          save: saveGuildCustomTagAction.bind(null, guildId),
          remove: deleteGuildCustomTagAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
