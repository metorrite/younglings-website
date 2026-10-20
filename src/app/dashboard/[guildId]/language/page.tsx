import { LanguageForm } from "@/components/dashboard/LanguageForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { messagesFor, t } from "@/lib/i18n";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveLanguageAction } from "./actions";

export const dynamic = "force-dynamic";

/** The page text is read from the message catalogue in the server's own language: this page is the sample of the dashboard translation groundwork. */
export default async function LanguagePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const config = await adminApi.language(guild).then(dashboardData);
  const texts = messagesFor(config.language, [
    "dashboard.language.panel",
    "dashboard.language.description",
    "dashboard.language.field",
    "dashboard.language.hint",
    "dashboard.language.only",
    "dashboard.language.saved",
    "dashboard.language.title",
  ] as const);

  return (
    <div className="space-y-6">
      <PageHeader title={t(config.language, "dashboard.language.title")} description={t(config.language, "dashboard.language.description")} />
      <LanguageForm initial={config} texts={texts} save={saveLanguageAction.bind(null, guildId)} />
    </div>
  );
}
