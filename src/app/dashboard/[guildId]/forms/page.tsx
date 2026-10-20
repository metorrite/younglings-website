import { FormsManager } from "@/components/dashboard/FormsManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { createFormAction, deleteFormAction, formSubmissionsAction, saveFormAction } from "./actions";

export const metadata = { title: "Web forms — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function FormsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [list, structure] = await Promise.all([adminApi.webForms(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);
  // Forms are filled in on the clan site's address, whatever address the dashboard is on.
  const publicBase = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Web forms"
        description="Build a form, share its link, and every answer opens a ticket and/or lands in a channel. People sign in with Discord to fill it in, so you always know who sent it."
      />
      <FormsManager
        guildId={guildId}
        initial={list}
        structure={structure}
        publicBase={publicBase}
        actions={{
          create: createFormAction.bind(null, guildId),
          save: saveFormAction.bind(null, guildId),
          remove: deleteFormAction.bind(null, guildId),
          submissions: formSubmissionsAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
